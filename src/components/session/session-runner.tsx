"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition, type ReactNode } from "react";
import { anadirLimitacion, borrarSerie, guardarSerie, marcarMolestia, terminarSesion } from "@/app/actions/session";
import { Chip, Icon, Note, SecondaryButton, TextButton } from "@/components/wizard/ui";
import type { ExerciseView, SavedSet, SessionData, SessionSlotView } from "@/lib/app/session-data";
import { calibrationState, formatKg, MAX_CALIBRATION_SETS } from "@/lib/domain/session";
import type { Joint } from "@/lib/domain/types";
import { JOINT_LABELS } from "@/lib/wizard/zones";
import { Sheet } from "./sheet";

// Sesión del día y calibración en una sola pantalla (plan.md U7; D63). Un ejercicio por pantalla,
// datos limpios y botones grandes abajo (PRD §9). Las cargas vienen del servidor; aquí solo se
// muestran y se ajustan con +/− (guardarraíl 3). El arcade va en el pop y en "NIVEL ARRIBA"; la
// Molestia, sin animación (DESIGN.md §1 y §7).

const ICONS = {
  ouch: "M3 12a9 9 0 1 0 18 0a9 9 0 1 0-18 0M12 7v6M12 16v1",
  swap: "M4 8h15l-4-4M20 16H5l4 4",
  later: "M4 5h16M4 10h9M4 15h6M18 9v11m0 0l-3-3m3 3l3-3",
  skip: "M5 5l10 7-10 7zM19 5v14",
  rest: "M4 13a8 8 0 1 0 16 0a8 8 0 1 0-16 0M12 9v4l3 2M9 2h6",
};

type Toast = { text: string; undo?: () => void; key: number };
type Pop = { title: string; sub: string; long?: boolean; key: number };
type SheetKind = null | "molestia" | "repetida" | "cambiar";

const isCalibrationDone = (view: ExerciseView, saved: SavedSet[]) => {
  if (!view.calibration) return true;
  const own = saved.filter((s) => s.exerciseId === view.exerciseId && s.status === "hecha");
  const machine = { id: view.exerciseId, incrementKg: view.incrementKg, minKg: view.minKg };
  return calibrationState(own, view.calibration.startLoadKg, view.calibration.targetReps, machine).done;
};

// Técnica plegada por defecto (regla de 360×640) y aviso de contribución leve, sobrio y sin animación.
// El aviso solo llega si las limitaciones del usuario coinciden con las zonas de implicación leve.
function Technique({ view }: { view: ExerciseView }) {
  if (!view.technique && !view.lightWarning) return null;
  return (
    <>
      {view.lightWarning ? <Note tone="warn">{view.lightWarning}</Note> : null}
      {view.technique ? (
        <details className="text-[15px]">
          <summary className="flex min-h-12 cursor-pointer items-center font-bold">Técnica</summary>
          <p className="m-0 pb-1 text-muted-foreground">{view.technique}</p>
        </details>
      ) : null}
    </>
  );
}

function isExerciseDone(view: ExerciseView, saved: SavedSet[]): boolean {
  const own = saved.filter((s) => s.exerciseId === view.exerciseId);
  if (own.some((s) => s.status === "detenida" || s.status === "saltada")) return true;
  if (view.calibration) return isCalibrationDone(view, saved);
  return own.filter((s) => s.status === "hecha").length >= view.sets;
}

const mmss = (ms: number) => {
  const total = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
};

// Solo se llaman desde manejadores de eventos y temporizadores, nunca al renderizar.
const clock = () => Date.now();
const newId = () => crypto.randomUUID();

// Precarga del ejercicio: la del servidor, la de la última serie hecha o, en calibración, la de la
// serie de prueba que toca según las series guardadas.
function preload(view: ExerciseView, saved: SavedSet[]): { weight: number; reps: number } {
  const own = saved.filter((s) => s.exerciseId === view.exerciseId && s.status === "hecha");
  if (view.calibration) {
    const machine = { id: view.exerciseId, incrementKg: view.incrementKg, minKg: view.minKg };
    const state = calibrationState(own, view.calibration.startLoadKg, view.calibration.targetReps, machine);
    return { weight: state.done ? state.fixedLoadKg : state.nextLoadKg, reps: view.calibration.targetReps };
  }
  const last = own.at(-1);
  return { weight: last?.weightKg ?? view.loadKg, reps: last?.reps ?? view.reps };
}

export function SessionRunner({ data }: { data: SessionData }) {
  const [slots, setSlots] = useState<SessionSlotView[]>(data.slots);
  const [saved, setSaved] = useState<SavedSet[]>(data.saved);
  const [queue, setQueue] = useState<number[]>(() => data.slots.map((_, i) => i).filter((i) => !isExerciseDone(data.slots[i], data.saved)));
  const [step, setStep] = useState(false);
  // Ajustes del usuario con +/−, solo para el ejercicio en el que los hizo.
  const [edit, setEdit] = useState<{ key: string; weight: number; reps: number } | null>(null);
  const [lastSetAt, setLastSetAt] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const [toast, setToast] = useState<Toast | null>(null);
  const [pop, setPop] = useState<Pop | null>(null);
  const [sheet, setSheet] = useState<SheetKind>(null);
  const [zones, setZones] = useState<Joint[]>([]);
  const [picked, setPicked] = useState<Joint[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [finishing, startFinish] = useTransition();
  const finishedRef = useRef(false);

  const current = queue.length > 0 ? slots[queue[0]] : null;
  const ownSets = useMemo(() => (current ? saved.filter((s) => s.exerciseId === current.exerciseId) : []), [current, saved]);
  const doneCount = ownSets.filter((s) => s.status === "hecha").length;
  const calibrating = current !== null && current.calibration !== null && !isCalibrationDone(current, saved);
  const completed = slots.length - queue.length;

  const currentKey = current ? `${current.exerciseId}:${queue[0]}` : "";
  const values = current ? (edit?.key === currentKey ? edit : preload(current, saved)) : { weight: 0, reps: 0 };
  const weight = values.weight;
  const reps = values.reps;
  const setWeight = (fn: (w: number) => number) => setEdit({ key: currentKey, weight: fn(weight), reps });
  const setReps = (fn: (r: number) => number) => setEdit({ key: currentKey, weight, reps: fn(reps) });

  // Descanso: cuenta hacia arriba, sin alarma (PRD §9).
  useEffect(() => {
    if (lastSetAt === null || !data.showRest) return;
    const t = setInterval(() => setNow(clock()), 1000);
    return () => clearInterval(t);
  }, [lastSetAt, data.showRest]);

  // La pantalla no se apaga entre series, si el navegador lo permite.
  useEffect(() => {
    let lock: { release: () => Promise<void> } | null = null;
    const nav = navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> } };
    nav.wakeLock?.request("screen").then((l) => (lock = l)).catch(() => {});
    return () => void lock?.release().catch(() => {});
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast((x) => (x?.key === toast.key ? null : x)), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (!pop) return;
    const t = setTimeout(() => setPop((x) => (x?.key === pop.key ? null : x)), pop.long ? 1100 : 600);
    return () => clearTimeout(t);
  }, [pop]);

  const finish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    startFinish(async () => {
      const res = await terminarSesion({ sessionId: data.id });
      if (res && !res.ok) {
        finishedRef.current = false;
        setError("No hemos podido cerrar la sesión. Revisa la conexión y vuelve a intentarlo.");
      }
    });
  }, [data.id]);

  useEffect(() => {
    if (queue.length === 0) finish();
  }, [queue.length, finish]);

  // Pasa al siguiente ejercicio, con la pantalla de paso si queda alguno (diseño D12).
  const advance = (nextQueue: number[], celebrate: boolean) => {
    setQueue(nextQueue);
    if (nextQueue.length === 0) return;
    setStep(true);
    if (celebrate) setPop({ title: "Ejercicio hecho", sub: "Al siguiente", key: clock() });
  };

  const saveOne = async (set: SavedSet) => {
    const res = await guardarSerie({ ...set, sessionId: data.id });
    if (!res.ok) {
      setSaved((all) => all.filter((s) => s.id !== set.id));
      // Un doble toque choca con la serie que ya se guardó: se descarta sin aviso.
      if (res.error !== "duplicada") setError("No se ha guardado la serie. Revisa la conexión y vuelve a intentarlo.");
      return null;
    }
    setError(null);
    return res;
  };

  const undoSets = (ids: string[], queueBefore: number[], stepBefore: boolean) => () => {
    setSaved((all) => all.filter((s) => !ids.includes(s.id)));
    setQueue(queueBefore);
    setStep(stepBefore);
    setToast(null);
    void Promise.all(ids.map((id) => borrarSerie({ id, sessionId: data.id }))).then((results) => {
      if (results.some((r) => !r.ok)) setError("No hemos podido deshacer. Revisa la conexión.");
    });
  };

  // Siguiente número de serie: el mayor guardado más uno (las series 1–20; la fila "detenida" va aparte).
  const nextIndex = Math.max(0, ...ownSets.filter((s) => s.setIndex <= 20).map((s) => s.setIndex)) + 1;

  // --- Serie normal --------------------------------------------------------------------------
  const setDone = async () => {
    if (!current || busy) return;
    const set: SavedSet = { id: newId(), exerciseId: current.exerciseId, setIndex: nextIndex, weightKg: weight, reps, rir: null, status: "hecha" };
    const all = [...saved, set];
    const queueBefore = queue;
    setSaved(all);
    setLastSetAt(clock());
    setNow(clock());
    const n = doneCount + 1;
    const exerciseDone = n >= current.sets;
    // Última serie de la sesión: se espera al guardado antes de cerrarla (revisión de código).
    if (exerciseDone && queue.length === 1) {
      setBusy(true);
      const res = await saveOne(set);
      setBusy(false);
      if (res) advance([], true);
      return;
    }
    setToast({ text: `Serie ${n} hecha.`, undo: undoSets([set.id], queueBefore, step), key: clock() });
    if (exerciseDone) advance(queue.slice(1), true);
    else setPop({ title: `Serie ${n} hecha`, sub: `A por la ${n + 1}`, key: clock() });
    await saveOne(set);
  };

  // --- Calibración ---------------------------------------------------------------------------
  const calibrate = async (rir: number, reached: boolean) => {
    if (!current?.calibration || busy) return;
    const target = current.calibration.targetReps;
    const set: SavedSet = {
      id: newId(),
      exerciseId: current.exerciseId,
      setIndex: nextIndex,
      weightKg: weight,
      // "No llegué": cuenta como una repetición menos que el objetivo (PRD §8: baja un salto).
      reps: reached ? target : Math.max(0, target - 1),
      rir: reached ? rir : 0,
      status: "hecha",
    };
    setBusy(true);
    setSaved((all) => [...all, set]);
    setLastSetAt(clock());
    setNow(clock());
    const res = await saveOne(set);
    setBusy(false);
    if (!res) return;
    const state = res.calibration;
    const queueBefore = queue;
    if (state?.done) {
      setPop({ title: "Peso fijado", sub: `${formatKg(state.fixedLoadKg)} kg`, long: true, key: clock() });
      setToast({ text: `${current.name}: ${formatKg(state.fixedLoadKg)} kg.`, undo: undoSets([set.id], queueBefore, step), key: clock() });
      advance(queue.slice(1), false);
    } else if (state) {
      setEdit(null);
      const verb = state.nextLoadKg > set.weightKg ? "Subimos" : state.nextLoadKg < set.weightKg ? "Bajamos" : "Repetimos";
      setToast({ text: `${verb} a ${formatKg(state.nextLoadKg)} kg.`, undo: undoSets([set.id], queueBefore, step), key: clock() });
    }
  };

  // --- Botonera ------------------------------------------------------------------------------
  const skip = async () => {
    if (!current || busy) return;
    const remaining = current.calibration ? 1 : Math.max(1, current.sets - doneCount);
    const sets: SavedSet[] = Array.from({ length: remaining }, (_, i) => ({
      id: newId(),
      exerciseId: current.exerciseId,
      setIndex: Math.min(20, nextIndex + i),
      weightKg: weight,
      reps: 0,
      rir: null,
      status: "saltada",
    }));
    const queueBefore = queue;
    setSaved((all) => [...all, ...sets]);
    // Se guarda antes de avanzar: si era el último ejercicio, la sesión se cierra después (revisión de código).
    setBusy(true);
    const results = await Promise.all(sets.map((s) => saveOne(s)));
    setBusy(false);
    if (results.some((r) => r === null)) return;
    setToast({ text: "Saltado. No cuenta para tu progreso y no te penaliza.", undo: undoSets(sets.map((s) => s.id), queueBefore, step), key: clock() });
    advance(queue.slice(1), false);
  };

  const later = () => {
    if (!current || queue.length < 2) return;
    const queueBefore = queue;
    const stepBefore = step;
    setQueue([...queue.slice(1), queue[0]]);
    setStep(true);
    setToast({
      text: `${current.name} pasa al final.`,
      undo: () => {
        setQueue(queueBefore);
        setStep(stepBefore);
        setToast(null);
      },
      key: clock(),
    });
  };

  const swap = (alt: ExerciseView) => {
    if (!current) return;
    const index = queue[0];
    const { alternatives, position, ...main } = current;
    setSlots((all) =>
      all.map((slot, i) =>
        i === index ? { ...alt, position, alternatives: [main, ...alternatives.filter((a) => a.exerciseId !== alt.exerciseId)] } : slot,
      ),
    );
    setSheet(null);
  };

  // --- Molestia (sin animación) --------------------------------------------------------------
  const closeSheet = useCallback(() => setSheet(null), []);

  const stopExercise = async () => {
    if (!current || busy) return;
    setBusy(true);
    const res = await marcarMolestia({ sessionId: data.id, exerciseId: current.exerciseId });
    setBusy(false);
    if (!res.ok) {
      setSheet(null);
      setError("No hemos podido guardarlo. Revisa la conexión y vuelve a intentarlo.");
      return;
    }
    setSaved((all) => [...all, { id: newId(), exerciseId: current.exerciseId, setIndex: 100, weightKg: 0, reps: 0, rir: null, status: "detenida" }]);
    if (res.repeated && res.zones.length > 0) {
      setZones(res.zones);
      setPicked([]);
      setSheet("repetida");
      return;
    }
    setSheet(null);
    setToast({ text: `Paramos ${current.name.toLowerCase()} por hoy. No sube carga.`, key: clock() });
    advance(queue.slice(1), false);
  };

  const addLimitation = async () => {
    if (!current || picked.length === 0 || busy) return;
    setBusy(true);
    const res = await anadirLimitacion({ sessionId: data.id, exerciseId: current.exerciseId, zones: picked });
    setBusy(false);
    setSheet(null);
    if (res.ok) {
      // Las limitaciones nuevas cambian lo que se puede hacer hoy: se vuelve a cargar la sesión desde
      // el servidor, que ya no ofrece ejercicios que carguen la zona (guardarraíl 6; revisión de código).
      window.location.reload();
      return;
    }
    setError("No hemos podido ajustar tu plan. Puedes hacerlo luego desde Ajustes.");
    advance(queue.slice(1), false);
  };

  const notNow = () => {
    setSheet(null);
    advance(queue.slice(1), false);
  };

  // --- Render --------------------------------------------------------------------------------
  if (!current) {
    return (
      <main className="wz-pad flex flex-1 flex-col items-center justify-center gap-4 py-10" aria-label="Cerrando la sesión">
        <p role="status" className="m-0 text-[17px] font-bold">
          {finishing ? "Guardando tu sesión…" : "Sesión lista."}
        </p>
        {error ? (
          <>
            <p role="alert" className="wz-error m-0">
              {error}
            </p>
            <SecondaryButton onClick={finish}>Reintentar</SecondaryButton>
          </>
        ) : null}
      </main>
    );
  }

  const tag = calibrating ? (
    <span className="wz-tag" data-calib="">
      Calibración
    </span>
  ) : (
    <span className="wz-tag">{data.label}</span>
  );
  const restText = lastSetAt !== null && data.showRest ? mmss(now - lastSetAt) : null;
  const band = (label: ReactNode, withOuch: boolean) => (
    <header className="wz-band wz-pad ss-band" aria-label="Marcador">
      <div className="ss-band-row">
        <span className="flex min-w-0 items-center gap-2">
          {label}
          <span className="whitespace-nowrap"><span className="sr-only">Ejercicio </span>{`${completed + 1} de ${slots.length}`}</span>
        </span>
        {withOuch ? (
          <button type="button" className="ss-ouch" aria-label={`Tengo molestia en ${current.name.toLowerCase()}`} onClick={() => setSheet("molestia")}>
            <Icon d={ICONS.ouch} />
            Tengo molestia
          </button>
        ) : null}
      </div>
      <div className="ss-xp" style={{ gridTemplateColumns: `repeat(${slots.length}, 1fr)` }} aria-hidden="true">
        {slots.map((_, i) => (
          <i key={i} data-on={i < completed ? "" : undefined} />
        ))}
      </div>
      <h1 className="wz-title">{current.name}</h1>
    </header>
  );

  const rest = restText ? (
    <p className="ss-rest" aria-live="off">
      <Icon d={ICONS.rest} />
      Llevas <b>{restText}</b> de descanso
    </p>
  ) : null;

  const errorNote = error ? (
    <p role="alert" className="wz-error m-0">
      {error}
    </p>
  ) : null;

  const dock = (
    <div className="ss-dock">
      <button type="button" onClick={() => setSheet("cambiar")} disabled={ownSets.length > 0 || busy}>
        <Icon d={ICONS.swap} />
        Cambiar ejercicio
      </button>
      <button type="button" onClick={later} disabled={queue.length < 2 || ownSets.length > 0 || busy}>
        <Icon d={ICONS.later} />
        Hacer al final
      </button>
      <button type="button" onClick={skip} disabled={busy}>
        <Icon d={ICONS.skip} />
        Saltar hoy
      </button>
    </div>
  );

  const sheets = (
    <>
      {sheet === "molestia" ? (
        <Sheet title={`Paramos ${current.name.toLowerCase()} por hoy`} onClose={closeSheet}>
          <p>
            No sumamos carga y lo marcamos. Si vuelve a molestar en tu próxima sesión, te recomendaremos ver a un profesional y te
            ofreceremos añadir la zona a tus limitaciones.
          </p>
          <button type="button" className="wz-cta ss-cta-sober" onClick={stopExercise} disabled={busy}>
            Parar este ejercicio
          </button>
          <TextButton onClick={closeSheet}>Lo toqué sin querer</TextButton>
        </Sheet>
      ) : null}
      {sheet === "repetida" ? (
        <Sheet title={`Es la segunda vez que ${current.name.toLowerCase()} te molesta`} onClose={notNow}>
          <p>Te recomendamos consultarlo con un profesional sanitario. Hoy lo paramos igualmente, sin subir carga.</p>
          <p className="font-bold" style={{ color: "var(--foreground)" }}>
            ¿Quieres añadir la zona a tus limitaciones?
          </p>
          <div className="flex flex-wrap gap-2">
            {zones.map((z) => (
              <Chip key={z} pressed={picked.includes(z)} onToggle={() => setPicked((p) => (p.includes(z) ? p.filter((x) => x !== z) : [...p, z]))}>
                {JOINT_LABELS[z]}
              </Chip>
            ))}
          </div>
          <button type="button" className="wz-cta" onClick={addLimitation} disabled={picked.length === 0 || busy}>
            Añadir y ajustar mi plan
          </button>
          <TextButton onClick={notNow}>Ahora no</TextButton>
        </Sheet>
      ) : null}
      {sheet === "cambiar" ? (
        <Sheet title={`Cambiar ${current.name.toLowerCase()} por…`} onClose={closeSheet}>
          {current.alternatives.length > 0 ? (
            <>
              <p>Mismo movimiento y mismos músculos, con tu equipo y tus limitaciones. Solo para hoy.</p>
              {current.alternatives.map((alt) => (
                <button key={alt.exerciseId} type="button" className="ss-alt" onClick={() => swap(alt)}>
                  <span>
                    {alt.name}
                    <small>{alt.calibration ? "Lo calibramos hoy" : `${formatKg(alt.loadKg)} kg, ${alt.equipmentName.toLowerCase()}`}</small>
                  </span>
                  <span aria-hidden="true">→</span>
                </button>
              ))}
            </>
          ) : (
            <p>No hay otro ejercicio que encaje con tu equipo y tus limitaciones. Puedes saltarlo hoy sin penalizar.</p>
          )}
          <TextButton onClick={closeSheet}>Cancelar</TextButton>
        </Sheet>
      ) : null}
    </>
  );

  // El aviso va dentro del pie, encima de los botones: nunca tapa "Serie hecha" ni "Empezar" (D8).
  // La región de estado existe siempre para que el lector de pantalla anuncie cada aviso.
  const toastEl = (
    <div role="status" className="contents">
      {toast ? (
        <div className="ss-toast">
          <span>{toast.text}</span>
          {toast.undo ? (
            <button type="button" onClick={toast.undo}>
              Deshacer
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );

  const overlays = (
    <>
      {pop ? (
        <div key={pop.key} className="ss-pop" data-long={pop.long ? "" : undefined} aria-hidden="true">
          <b>{pop.title}</b>
          {pop.sub}
        </div>
      ) : null}
      {sheets}
    </>
  );

  // Paso entre ejercicios (diseño D12): el siguiente, su máquina y lo que toca.
  if (step) {
    return (
      <>
        {band(
          <>
            <span className="wz-tag">Siguiente</span>
            {current.calibration && !isCalibrationDone(current, saved) ? (
              <span className="wz-tag" data-calib="">
                Calibración
              </span>
            ) : null}
          </>,
          false,
        )}
        <div className="wz-stripes" aria-hidden="true" />
        <main className="wz-pad flex flex-1 flex-col gap-4 py-4" aria-label={`Siguiente: ${current.name}`}>
          <p className="m-0 text-[15px] text-muted-foreground">{current.equipmentName}</p>
          <div className="ss-stat">
            <span className="ss-stat-label">{current.calibration ? "Peso de prueba" : "Peso"}</span>
            <span className="ss-stat-num" data-numeric="">
              {formatKg(weight)}
            </span>
            <span className="ss-stat-unit">kg</span>
          </div>
          <p className="ss-guide">
            {current.calibration
              ? `Calibración: hasta ${MAX_CALIBRATION_SETS} series de prueba de ${current.calibration.targetReps} repeticiones.`
              : `${current.sets} series de ${current.repMin} a ${current.repMax} repeticiones.`}
          </p>
          <Technique view={current} />
          {rest}
          {errorNote}
        </main>
        <div className="wz-foot wz-pad">
          {toastEl}
          <button type="button" className="wz-cta" onClick={() => setStep(false)}>
            Empezar
          </button>
          <SecondaryButton onClick={() => setSheet("cambiar")} disabled={ownSets.length > 0}>
            Cambiar ejercicio
          </SecondaryButton>
          <TextButton onClick={finish}>Terminar la sesión ahora</TextButton>
        </div>
        {overlays}
      </>
    );
  }

  // Calibración (PRD §8; diseño D27): interfaz propia, con +/− por si la máquina no tiene ese peso.
  if (calibrating && current.calibration) {
    const n = ownSets.filter((s) => s.status === "hecha").length + 1;
    const target = current.calibration.targetReps;
    return (
      <>
        {band(tag, true)}
        <div className="wz-stripes" aria-hidden="true" />
        <main className="wz-pad flex flex-1 flex-col gap-3 py-3" aria-label={`Calibración de ${current.name}`}>
          <p className="ss-guide">
            {n === 1 ? (
              <>
                Haz <b>{target} repeticiones</b> con este peso. Empezamos bajo a propósito. Esta máquina sube de {formatKg(current.incrementKg)} en{" "}
                {formatKg(current.incrementKg)} kg.
              </>
            ) : (
              <>
                Serie de prueba {n} de {MAX_CALIBRATION_SETS} como máximo. Haz <b>{target} repeticiones</b>.
              </>
            )}
          </p>
          <div className="grid grid-cols-[1fr_auto] items-stretch gap-2">
            <div className="ss-stat">
              <span className="ss-stat-label">Peso de prueba</span>
              <span className="ss-stat-num" data-numeric="">
                {formatKg(weight)}
              </span>
              <span className="ss-stat-unit">kg</span>
            </div>
            <div className="ss-pm grid-cols-1! w-16">
              <button type="button" aria-label={`Más peso, ahora ${formatKg(weight)} kg`} onClick={() => setWeight((w) => w + current.incrementKg)}>
                +
              </button>
              <button
                type="button"
                aria-label={`Menos peso, ahora ${formatKg(weight)} kg`}
                disabled={weight - current.incrementKg < current.minKg}
                onClick={() => setWeight((w) => Math.max(current.minKg, w - current.incrementKg))}
              >
                −
              </button>
            </div>
          </div>
          <h2 id="rir-q" className="m-0 text-[17px] font-extrabold leading-tight">
            ¿Cuántas más podrías haber hecho?
          </h2>
          <p className="m-0 -mt-2 text-[14px] text-muted-foreground">Con buena técnica, sin llegar al fallo.</p>
          <div className="ss-rir" role="group" aria-labelledby="rir-q">
            {[0, 1, 2, 3, 4].map((r) => (
              <button key={r} type="button" disabled={busy} onClick={() => calibrate(r, true)} aria-label={r === 4 ? "4 o más" : String(r)}>
                {r === 4 ? "4+" : r}
              </button>
            ))}
          </div>
          <TextButton onClick={() => calibrate(0, false)} disabled={busy}>
            {`No llegué a las ${target}`}
          </TextButton>
          <Technique view={current} />
          {rest}
          {errorNote}
        </main>
        <div className="wz-foot wz-pad">
          {toastEl}
          {dock}
        </div>
        {overlays}
      </>
    );
  }

  // Serie normal (PRD §9; diseño D22: peso, repeticiones, +/− y "Serie hecha" sin scroll en 360×640).
  const n = doneCount + 1;
  const levelUp = current.levelUpFromKg !== null && doneCount === 0 && weight === current.loadKg;
  return (
    <>
      {band(tag, true)}
      <div className="wz-stripes" aria-hidden="true" />
      <main className="wz-pad flex flex-1 flex-col gap-3 py-3" aria-label={current.name}>
        {levelUp && current.levelUpFromKg !== null ? (
          <div className="ss-levelup" role="status">
            <div className="ss-levelup-top">
              <span className="wz-tag">Nivel arriba</span>
              <span>+{formatKg(current.loadKg - current.levelUpFromKg)} kg</span>
            </div>
            <span>
              Hoy subes de {formatKg(current.levelUpFromKg)} a {formatKg(current.loadKg)} kg: llegaste al máximo de repeticiones en todas las
              series dos sesiones seguidas.
            </span>
          </div>
        ) : null}
        <div className="ss-sets">
          <span>{`Serie ${Math.min(n, current.sets)} de ${current.sets}`}</span>
          <span className="ss-sets-bar" aria-hidden="true">
            {Array.from({ length: current.sets }, (_, i) => (
              <i key={i} data-done={i < doneCount ? "" : undefined} />
            ))}
          </span>
        </div>
        <p className="ss-guide">
          Haz de <b>{`${current.repMin} a ${current.repMax} repeticiones`}</b> y para cuando aún te queden 2 o 3.
        </p>
        <div className="ss-stats">
          <div className="ss-stat">
            <span className="ss-stat-label">Peso</span>
            <span className="ss-stat-num" data-numeric="">
              {formatKg(weight)}
            </span>
            <span className="ss-stat-unit">
              kg
              {current.levelUpFromKg !== null && weight > current.levelUpFromKg ? (
                <>
                  , <b>{`subes ${formatKg(weight - current.levelUpFromKg)}`}</b>
                </>
              ) : null}
            </span>
          </div>
          <div className="ss-stat">
            <span className="ss-stat-label">Repeticiones</span>
            <span className="ss-stat-num" data-numeric="">
              {reps}
            </span>
            <span className="ss-stat-unit">reps</span>
          </div>
        </div>
        <div className="ss-pm">
          <button
            type="button"
            aria-label={`Menos peso, ahora ${formatKg(weight)} kg`}
            disabled={weight - current.incrementKg < current.minKg}
            onClick={() => setWeight((w) => Math.max(current.minKg, w - current.incrementKg))}
          >
            −
          </button>
          <button type="button" aria-label={`Más peso, ahora ${formatKg(weight)} kg`} onClick={() => setWeight((w) => w + current.incrementKg)}>
            +
          </button>
          <button type="button" aria-label={`Menos repeticiones, ahora ${reps}`} disabled={reps <= 0} onClick={() => setReps((r) => Math.max(0, r - 1))}>
            −
          </button>
          <button type="button" aria-label={`Más repeticiones, ahora ${reps}`} onClick={() => setReps((r) => Math.min(100, r + 1))}>
            +
          </button>
        </div>
        <Technique view={current} />
        {rest}
        {errorNote}
      </main>
      <div className="wz-foot wz-pad">
        {toastEl}
        {dock}
        <button type="button" className="wz-cta" onClick={setDone} disabled={busy}>
          Serie hecha
        </button>
      </div>
      {overlays}
    </>
  );
}
