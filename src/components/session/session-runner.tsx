"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition, type ReactNode } from "react";
import { anadirLimitacion, borrarSerie, editarSerie, guardarSerie, marcarMolestia, terminarSesion, type SerieResult } from "@/app/actions/session";
import { Chip, Icon, Note, SecondaryButton, TextButton } from "@/components/wizard/ui";
import type { ExerciseView, SavedSet, SessionData, SessionSlotView } from "@/lib/app/session-data";
import { setRowLabel, setRows, type SetRow } from "@/lib/app/set-rows";
import { calibrationState, formatKg, MAX_CALIBRATION_SETS } from "@/lib/domain/session";
import type { Joint } from "@/lib/domain/types";
import { JOINT_LABELS } from "@/lib/wizard/zones";
import { ExerciseFigure, ExerciseThumb } from "./exercise-figure";
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
  check: "M4 12l5 5L20 6",
};

type Toast = { text: string; undo?: () => void; key: number };
type Pop = { title: string; sub: string; long?: boolean; key: number };
type SheetKind = null | "molestia" | "repetida" | "cambiar" | "tecnica" | "editar";
// Serie hecha que se corrige en la hoja "Editar serie" (diseño D8).
type Editing = { id: string; n: number; weight: number; reps: number; rir: number | null };
const RIR_OPTIONS = [0, 1, 2, 3, 4] as const;

const isCalibrationDone = (view: ExerciseView, saved: SavedSet[]) => {
  if (!view.calibration) return true;
  const own = saved.filter((s) => s.exerciseId === view.exerciseId && s.status === "hecha");
  const machine = { id: view.exerciseId, incrementKg: view.incrementKg, minKg: view.minKg };
  return calibrationState(own, view.calibration.startLoadKg, view.calibration.targetReps, machine).done;
};

// Aviso de contribución leve, sobrio y sin animación. Solo llega si las limitaciones del usuario
// coinciden con las zonas de implicación leve del ejercicio.
function LightWarning({ view }: { view: ExerciseView }) {
  return view.lightWarning ? <Note>{view.lightWarning}</Note> : null;
}

// Técnica a la vista (feedback de Pablo, 18/11): dibujo del movimiento y texto del catálogo. En la
// pantalla de paso, lo que toca va al lado del dibujo para que el texto se lea sin scroll.
function HowTo({ view, aside }: { view: ExerciseView; aside?: ReactNode }) {
  return (
    <div className="ss-howto">
      <ExerciseFigure exerciseId={view.exerciseId} name={view.name} />
      {aside}
      {view.technique ? <p className="ss-guide">{view.technique}</p> : null}
    </div>
  );
}

// Acceso compacto a la técnica en la pantalla de la serie: el dibujo en pequeño y, si cabe, el texto
// recortado. Abre la hoja con todo, para no romper la regla de 360×640.
function HowToRow({ view, withText, compact, onOpen }: { view: ExerciseView; withText?: boolean; compact?: boolean; onOpen: () => void }) {
  return (
    <button type="button" className="ss-howto-row" data-compact={compact ? "" : undefined} onClick={onOpen} aria-haspopup="dialog">
      <ExerciseThumb exerciseId={view.exerciseId} />
      <span className="ss-howto-text">
        <b>Cómo se hace</b>
        {withText && view.technique ? <small>{view.technique}</small> : null}
      </span>
      {compact ? null : <span aria-hidden="true">→</span>}
    </button>
  );
}

// Series del ejercicio: hechas (se tocan para corregirlas, diseño D8), la de ahora y las pendientes.
function SetGrid({ rows, noun, onEdit }: { rows: SetRow[]; noun: "Serie" | "Prueba"; onEdit: (id: string) => void }) {
  return (
    <ol className="ss-setgrid" aria-label={noun === "Serie" ? "Tus series" : "Tus series de prueba"} style={{ gridTemplateColumns: `repeat(${Math.min(Math.max(rows.length, 3), 4)}, 1fr)` }}>
      {rows.map((row) => (
        <li key={row.n}>
          {row.state === "hecha" ? (
            <button type="button" className="ss-setcell" data-state="hecha" aria-label={setRowLabel(row, noun)} onClick={() => onEdit(row.id)}>
              <span className="ss-setcell-top">
                {`${noun} ${row.n}`}
                <Icon d={ICONS.check} />
              </span>
              <b>{`${formatKg(row.weightKg)} kg`}</b>
              <span>{`${row.reps} reps`}</span>
              {row.answer ? <span className="ss-setcell-answer">{row.answer}</span> : null}
            </button>
          ) : (
            <div className="ss-setcell" data-state={row.state} aria-label={setRowLabel(row, noun)} role="group">
              <span className="ss-setcell-top">{`${noun} ${row.n}`}</span>
              <b>{row.state === "ahora" ? "Ahora" : "Pendiente"}</b>
            </div>
          )}
        </li>
      ))}
    </ol>
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
  // Al abrir una sesión sin series, el primer ejercicio también pasa por la pantalla de paso: ahí se
  // ve cómo se hace antes de la primera serie.
  const [step, setStep] = useState(data.saved.length === 0);
  // Calibración en dos tiempos: hacer la serie de prueba y luego contar las repeticiones hechas y
  // responder cuántas más podría haber hecho (por defecto, el objetivo).
  const [answer, setAnswer] = useState<{ key: string; reps: number } | null>(null);
  const [editing, setEditing] = useState<Editing | null>(null);
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
  // Prueba de calibración guardándose: la pantalla sigue en calibración hasta que responde el
  // servidor, aunque la prueba nueva ya cierre la calibración en el cliente (E2E p07, 20/11).
  const [calibSaving, setCalibSaving] = useState<string | null>(null);
  const [finishing, startFinish] = useTransition();
  const finishedRef = useRef(false);

  const current = queue.length > 0 ? slots[queue[0]] : null;
  const ownSets = useMemo(() => (current ? saved.filter((s) => s.exerciseId === current.exerciseId) : []), [current, saved]);
  const doneCount = ownSets.filter((s) => s.status === "hecha").length;
  const completed = slots.length - queue.length;

  const currentKey = current ? `${current.exerciseId}:${queue[0]}` : "";
  const calibrating =
    current !== null && current.calibration !== null && (calibSaving === currentKey || !isCalibrationDone(current, saved));
  const values = current ? (edit?.key === currentKey ? edit : preload(current, saved)) : { weight: 0, reps: 0 };
  const weight = values.weight;
  const reps = values.reps;
  const setWeight = (fn: (w: number) => number) => setEdit({ key: currentKey, weight: fn(weight), reps });
  const setReps = (fn: (r: number) => number) => setEdit({ key: currentKey, weight, reps: fn(reps) });
  const answering = calibrating && answer?.key === currentKey ? answer : null;

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
  // Se guardan las repeticiones que hizo de verdad. Por debajo del objetivo cuenta como "no llegué"
  // (PRD §8: baja un salto) y se guarda con 0 de reserva.
  const calibrate = async (rir: number) => {
    if (!current?.calibration || !answering || busy) return;
    const target = current.calibration.targetReps;
    const reached = answering.reps >= target;
    const set: SavedSet = {
      id: newId(),
      exerciseId: current.exerciseId,
      setIndex: nextIndex,
      weightKg: weight,
      reps: answering.reps,
      rir: reached ? rir : 0,
      status: "hecha",
    };
    setBusy(true);
    setCalibSaving(currentKey);
    setAnswer(null);
    setSaved((all) => [...all, set]);
    setLastSetAt(clock());
    setNow(clock());
    const res = await saveOne(set);
    setBusy(false);
    setCalibSaving(null);
    if (!res) {
      setAnswer(answering);
      return;
    }
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

  // --- Corregir una serie (diseño D8) --------------------------------------------------------
  const openEdit = (id: string) => {
    const set = ownSets.find((s) => s.id === id);
    if (!set || busy) return;
    const n = ownSets.filter((s) => s.status === "hecha" && s.setIndex <= set.setIndex).length;
    setEditing({ id, n, weight: set.weightKg, reps: set.reps, rir: set.rir });
    setSheet("editar");
  };

  // Tras corregir o borrar, el servidor recalcula la calibración: si queda fijada, se pasa al siguiente.
  const afterChange = (res: SerieResult, next: SavedSet[]) => {
    if (!res.ok) {
      setError("No se ha guardado el cambio. Revisa la conexión y vuelve a intentarlo.");
      return;
    }
    setError(null);
    setSaved(next);
    setEdit(null);
    if (current?.calibration && res.calibration?.done) {
      setPop({ title: "Peso fijado", sub: `${formatKg(res.calibration.fixedLoadKg)} kg`, long: true, key: clock() });
      advance(queue.slice(1), false);
    }
  };

  const saveEditing = async () => {
    if (!editing || busy) return;
    const target = current?.calibration?.targetReps ?? 0;
    // En calibración la respuesta va con la serie; por debajo del objetivo, 0 de reserva ("no llegué").
    const rir = editing.rir === null ? null : editing.reps >= target ? editing.rir : 0;
    const next = saved.map((s) => (s.id === editing.id ? { ...s, weightKg: editing.weight, reps: editing.reps, rir } : s));
    setSheet(null);
    setBusy(true);
    const res = await editarSerie({ id: editing.id, sessionId: data.id, weightKg: editing.weight, reps: editing.reps, rir });
    setBusy(false);
    afterChange(res, next);
    if (res.ok) setToast({ text: `${editing.rir === null ? "Serie" : "Prueba"} ${editing.n} corregida.`, key: clock() });
  };

  const deleteEditing = async () => {
    if (!editing || busy) return;
    const next = saved.filter((s) => s.id !== editing.id);
    setSheet(null);
    setBusy(true);
    const res = await borrarSerie({ id: editing.id, sessionId: data.id });
    setBusy(false);
    afterChange(res, next);
    if (res.ok) setToast({ text: `${editing.rir === null ? "Serie" : "Prueba"} ${editing.n} borrada.`, key: clock() });
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
      {sheet === "tecnica" ? (
        <Sheet title={`Cómo se hace: ${current.name.toLowerCase()}`} onClose={closeSheet}>
          <HowTo view={current} />
          <LightWarning view={current} />
          <SecondaryButton onClick={closeSheet}>Entendido</SecondaryButton>
        </Sheet>
      ) : null}
      {sheet === "editar" && editing ? (
        <Sheet title={`Corregir ${editing.rir === null ? "serie" : "prueba"} ${editing.n}`} onClose={closeSheet}>
          <p>Deja el peso y las repeticiones que hiciste de verdad.</p>
          <div className="ss-stats">
            <div className="ss-stat">
              <span className="ss-stat-label">Peso</span>
              <span className="ss-stat-num" data-numeric="">
                {formatKg(editing.weight)}
              </span>
              <span className="ss-stat-unit">kg</span>
            </div>
            <div className="ss-stat">
              <span className="ss-stat-label">Repeticiones</span>
              <span className="ss-stat-num" data-numeric="">
                {editing.reps}
              </span>
              <span className="ss-stat-unit">reps hechas</span>
            </div>
          </div>
          <div className="ss-pm">
            <button
              type="button"
              aria-label={`Menos peso, ahora ${formatKg(editing.weight)} kg`}
              disabled={editing.weight - current.incrementKg < current.minKg}
              onClick={() => setEditing({ ...editing, weight: Math.max(current.minKg, editing.weight - current.incrementKg) })}
            >
              −
            </button>
            <button type="button" aria-label={`Más peso, ahora ${formatKg(editing.weight)} kg`} onClick={() => setEditing({ ...editing, weight: editing.weight + current.incrementKg })}>
              +
            </button>
            <button
              type="button"
              aria-label={`Menos repeticiones, ahora ${editing.reps}`}
              disabled={editing.reps <= 0}
              onClick={() => setEditing({ ...editing, reps: Math.max(0, editing.reps - 1) })}
            >
              −
            </button>
            <button type="button" aria-label={`Más repeticiones, ahora ${editing.reps}`} onClick={() => setEditing({ ...editing, reps: Math.min(100, editing.reps + 1) })}>
              +
            </button>
          </div>
          {editing.rir !== null && current.calibration && editing.reps >= current.calibration.targetReps ? (
            <>
              <h3 id="rir-edit" className="m-0 text-[15px] font-extrabold">
                ¿Cuántas más podrías haber hecho?
              </h3>
              <div className="ss-rir" role="group" aria-labelledby="rir-edit">
                {RIR_OPTIONS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    aria-pressed={editing.rir === r}
                    aria-label={r === 4 ? "4 o más" : String(r)}
                    onClick={() => setEditing({ ...editing, rir: r })}
                  >
                    {r === 4 ? "4+" : r}
                  </button>
                ))}
              </div>
            </>
          ) : null}
          <button type="button" className="wz-cta" onClick={saveEditing} disabled={busy}>
            Guardar
          </button>
          <TextButton onClick={deleteEditing} disabled={busy}>
            {`Borrar ${editing.rir === null ? "serie" : "prueba"}`}
          </TextButton>
        </Sheet>
      ) : null}
    </>
  );

  // El aviso va dentro del pie, encima de los botones: nunca tapa "Serie hecha" ni "Empezar" (D8).
  // Mientras se ve, ocupa el hueco de la botonera secundaria en vez de apilarse sobre ella: así el
  // pie no crece y no tapa los +/− en 360×640 con nombres largos (E2E p07, 20/11).
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
            <span className="wz-tag">{completed === 0 ? "Primero" : "Siguiente"}</span>
            {current.calibration && !isCalibrationDone(current, saved) ? (
              <span className="wz-tag" data-calib="">
                Calibración
              </span>
            ) : null}
          </>,
          false,
        )}
        <div className="wz-stripes" aria-hidden="true" />
        <main className="wz-pad flex flex-1 flex-col gap-3 py-3" aria-label={`${completed === 0 ? "Primero" : "Siguiente"}: ${current.name}`}>
          <HowTo
            view={current}
            aside={
              <p className="ss-plan">
                <span className="ss-plan-kg" data-numeric="">
                  {formatKg(weight)}
                  <small>kg</small>
                </span>
                <span>
                  {current.calibration ? (
                    <>
                      <b>{`Calibración: hasta ${MAX_CALIBRATION_SETS} pruebas de ${current.calibration.targetReps} repeticiones`}</b>
                      {`, ${current.equipmentName.toLowerCase()}`}
                    </>
                  ) : (
                    <>
                      <b>{`${current.sets} series de ${current.repMin} a ${current.repMax} repeticiones`}</b>
                      {`, ${current.equipmentName.toLowerCase()}`}
                    </>
                  )}
                </span>
              </p>
            }
          />
          <LightWarning view={current} />
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
  // Primero se hace la serie de prueba; después se cuentan las repeticiones hechas y se responde.
  if (calibrating && current.calibration) {
    const n = ownSets.filter((s) => s.status === "hecha").length + 1;
    const target = current.calibration.targetReps;
    const rows = setRows(ownSets, current.sets, current.calibration);
    const grid = rows.length > 1 ? <SetGrid rows={rows} noun="Prueba" onEdit={openEdit} /> : null;

    if (answering) {
      const reached = answering.reps >= target;
      const setAnswerReps = (r: number) => setAnswer({ key: currentKey, reps: Math.min(100, Math.max(0, r)) });
      return (
        <>
          {band(tag, true)}
          <div className="wz-stripes" aria-hidden="true" />
          <main className="wz-pad flex flex-1 flex-col gap-3 py-3" aria-label={`Prueba ${n} de ${current.name}`}>
            <p className="ss-guide">
              {`Prueba ${n} con `}
              <b>{`${formatKg(weight)} kg`}</b>
              {`. ¿Cuántas repeticiones hiciste? El objetivo era ${target}.`}
            </p>
            <div className="grid grid-cols-[1fr_auto] items-stretch gap-2">
              <div className="ss-stat">
                <span className="ss-stat-label">Repeticiones hechas</span>
                <span className="ss-stat-num" data-numeric="">
                  {answering.reps}
                </span>
                <span className="ss-stat-unit">{`de ${target}`}</span>
              </div>
              <div className="ss-pm grid-cols-1! w-16">
                <button type="button" aria-label={`Más repeticiones, ahora ${answering.reps}`} onClick={() => setAnswerReps(answering.reps + 1)}>
                  +
                </button>
                <button type="button" aria-label={`Menos repeticiones, ahora ${answering.reps}`} disabled={answering.reps <= 0} onClick={() => setAnswerReps(answering.reps - 1)}>
                  −
                </button>
              </div>
            </div>
            {reached ? (
              <>
                <h2 id="rir-q" className="m-0 text-[17px] font-extrabold leading-tight">
                  ¿Cuántas más podrías haber hecho?
                </h2>
                <p className="m-0 -mt-2 text-[14px] text-muted-foreground">Con buena técnica, sin llegar al fallo.</p>
                <div className="ss-rir" role="group" aria-labelledby="rir-q">
                  {RIR_OPTIONS.map((r) => (
                    <button key={r} type="button" disabled={busy} onClick={() => calibrate(r)} aria-label={r === 4 ? "4 o más" : String(r)}>
                      {r === 4 ? "4+" : r}
                    </button>
                  ))}
                </div>
                <TextButton onClick={() => setAnswerReps(target - 1)} disabled={busy}>
                  {`No llegué a las ${target}`}
                </TextButton>
              </>
            ) : (
              <>
                <p className="ss-guide">{`No pasa nada: con ${answering.reps} de ${target}, la siguiente prueba va con menos peso.`}</p>
                <button type="button" className="wz-cta" onClick={() => calibrate(0)} disabled={busy}>
                  Guardar la prueba
                </button>
              </>
            )}
            {grid}
            {errorNote}
          </main>
          <div className="wz-foot wz-pad">
            {toastEl}
            <TextButton onClick={() => setAnswer(null)} disabled={busy}>
              Volver a la serie
            </TextButton>
          </div>
          {overlays}
        </>
      );
    }

    return (
      <>
        {band(tag, true)}
        <div className="wz-stripes" aria-hidden="true" />
        <main className="wz-pad flex flex-1 flex-col gap-3 py-3" aria-label={`Calibración de ${current.name}`}>
          <HowToRow view={current} withText={n === 1} onOpen={() => setSheet("tecnica")} />
          {n === 1 ? (
            <p className="ss-guide">
              {`Prueba 1: haz `}
              <b>{`${target} repeticiones`}</b>
              {` con este peso. Empezamos bajo a propósito; esta máquina sube de ${formatKg(current.incrementKg)} en ${formatKg(current.incrementKg)} kg.`}
            </p>
          ) : (
            <p className="ss-sets">{`Prueba ${n} de ${MAX_CALIBRATION_SETS} como máximo: haz ${target} repeticiones con este peso.`}</p>
          )}
          {grid}
          <div className="grid grid-cols-[1fr_auto] items-stretch gap-2">
            <div className="ss-stat">
              <span className="ss-stat-label">Peso de prueba</span>
              <span className="ss-stat-num" data-numeric="">
                {formatKg(weight)}
              </span>
              <span className="ss-stat-unit">{`kg, ${target} reps`}</span>
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
          <LightWarning view={current} />
          {rest}
          {errorNote}
        </main>
        <div className="wz-foot wz-pad">
          {toastEl}
          {toast ? null : dock}
          <button type="button" className="wz-cta" onClick={() => setAnswer({ key: currentKey, reps: target })} disabled={busy}>
            Serie hecha
          </button>
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
          <HowToRow view={current} compact onOpen={() => setSheet("tecnica")} />
        </div>
        <SetGrid rows={setRows(ownSets, current.sets, null)} noun="Serie" onEdit={openEdit} />
        <p className="ss-guide">
          <b>{`${current.sets} series de ${current.repMin} a ${current.repMax} repeticiones`}</b>{` con ${formatKg(current.loadKg)} kg. Para cuando aún te queden 2 o 3.`}
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
            <span className="ss-stat-unit">reps hechas</span>
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
        <LightWarning view={current} />
        {rest}
        {errorNote}
      </main>
      <div className="wz-foot wz-pad">
        {toastEl}
        {toast ? null : dock}
        <button type="button" className="wz-cta" onClick={setDone} disabled={busy}>
          Serie hecha
        </button>
      </div>
      {overlays}
    </>
  );
}
