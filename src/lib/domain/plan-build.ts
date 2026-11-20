import { availableExercises, hasEquipment, isExcludedByLimitations } from "./exclusion";
import { refilterPlan } from "./refilter";
import { isExtraRegion, setsPerSlot, type SessionKind, type Template } from "./template";
import { MAIN_MUSCLE_GROUPS, type Exercise, type Focus, type HoleReason, type Joint, type Plan } from "./types";
import { MAX_WEEKLY_SETS_PER_GROUP, MIN_SETS_PER_EXERCISE, validateVolume } from "./volume";

// Montaje del plan a partir de la plantilla y de la elección de la IA (PRD §7; plan.md U5, KTD6,
// KTD19, KTD20; decisiones D53–D56). La IA solo elige el ejercicio de cada hueco. Todo lo demás
// lo decide este código, sin red ni hora del sistema:
// - comprueba que cada ID existe en el catálogo filtrado por equipo y es de la región del hueco
//   (catálogo cerrado, guardarraíl 2);
// - fija las series según los minutos y el foco (guardarraíl 3: la IA no toca el volumen);
// - aplica las limitaciones con el refiltrado (guardarraíl 6; KTD19: la IA nunca las ve);
// - ajusta y valida los topes con el validador único (guardarraíl 4).

export type BuiltSlot = {
  position: number;
  region: string;
  pattern: string;
  exerciseId: string | null;
  holeReason?: HoleReason;
  sets: number;
  repMin: number;
  repMax: number;
};
export type BuiltSession = { dayIndex: number; kind: SessionKind; label: string; slots: BuiltSlot[] };
export type BuiltPlan = { template: "cuerpo_completo" | "torso_pierna"; sessions: BuiltSession[] };

export type AssembleInput = {
  template: Template;
  // choices[sesión][hueco] = ID elegido por la IA, o null en un hueco sin ningún ejercicio posible
  // con el equipo del usuario (no se le pide a la IA; queda vacío con motivo de equipo).
  choices: (string | null)[][];
  catalog: readonly Exercise[];
  equipmentIds: readonly string[];
  limitations: readonly Joint[];
  minutes: number;
  focus: Focus;
};

export type AssembleResult =
  | { ok: true; plan: BuiltPlan }
  | { ok: false; reason: "forma_incorrecta" | "id_fuera_de_catalogo" | "region_incorrecta" | "repetido" | "topes" };

export { setsPerSlot };

const LABELS: Record<SessionKind, string> = { cuerpo_completo: "Cuerpo completo", torso: "Torso", pierna: "Pierna" };

export function assemblePlan(input: AssembleInput): AssembleResult {
  const { template, choices, catalog, equipmentIds, limitations, minutes, focus } = input;
  if (choices.length !== template.sessions.length || choices.some((c, i) => c.length !== template.sessions[i].slots.length)) {
    return { ok: false, reason: "forma_incorrecta" };
  }

  // Catálogo que vio la IA: solo filtrado por equipo (KTD19).
  const offered = new Map(catalog.filter((e) => hasEquipment(e, equipmentIds)).map((e) => [e.id, e]));
  const sessions: BuiltSession[] = [];

  for (const [index, session] of template.sessions.entries()) {
    // Las series de los huecos principales no cambian por los huecos extra de brazo o core, que
    // llevan las suyas desde la plantilla (solo con los minutos que sobran).
    const mainCount = session.slots.filter((s) => !isExtraRegion(s.region)).length;
    const sets = setsPerSlot(Math.max(mainCount, 1), minutes, focus);
    const used = new Set<string>();
    const slots: BuiltSlot[] = [];
    for (const [slotIndex, slot] of session.slots.entries()) {
      const choice = choices[index][slotIndex];
      const regionPool = [...offered.values()].filter((e) => e.region === slot.region);
      const extra = isExtraRegion(slot.region);
      if (choice === null) {
        if (regionPool.length > 0) return { ok: false, reason: "forma_incorrecta" };
        // Un hueco extra sin ejercicio posible con el equipo no se muestra: es un complemento.
        if (extra) continue;
        slots.push({ position: slots.length, region: slot.region, pattern: slot.region, exerciseId: null, holeReason: "sin_alternativa_equipo", sets, repMin: slot.repMin, repMax: slot.repMax });
        continue;
      }
      const exercise = offered.get(choice);
      if (!exercise) return { ok: false, reason: "id_fuera_de_catalogo" };
      if (exercise.region !== slot.region) return { ok: false, reason: "region_incorrecta" };
      // Repetir en la sesión solo cuando no queda ningún otro ejercicio de esa región.
      if (used.has(exercise.id) && regionPool.some((e) => !used.has(e.id))) return { ok: false, reason: "repetido" };
      used.add(exercise.id);
      // En «Más fuerza», el principal lleva 2 o 3 series (PRD §7).
      const slotSets = extra ? slot.sets : slot.principal ? Math.min(sets, 3) : sets;
      slots.push({
        position: slots.length,
        region: slot.region,
        pattern: exercise.pattern,
        exerciseId: exercise.id,
        sets: slotSets,
        repMin: slot.repMin,
        repMax: slot.repMax,
      });
    }
    sessions.push({ dayIndex: index, kind: session.kind, label: LABELS[session.kind], slots });
  }

  const result = applyConstraints(sessions, catalog, equipmentIds, limitations);
  if (!result.ok) return { ok: false, reason: "topes" };

  return { ok: true, plan: { template: template.sessions[0].kind === "cuerpo_completo" ? "cuerpo_completo" : "torso_pierna", sessions } };
}

// Aplica limitaciones y equipo a un plan ya montado y ajusta los topes (lo usan la generación y el
// refiltrado, D35; misma lógica en los dos): refiltrado (sustituye o deja hueco con motivo), relleno
// de huecos, reparación del suelo y ajuste del techo. Modifica las sesiones y devuelve el resultado
// del validador único. Nunca deja un ejercicio que cargue una zona limitada (guardarraíl 6).
export function applyConstraints(
  sessions: BuiltSession[],
  catalog: readonly Exercise[],
  equipmentIds: readonly string[],
  limitations: readonly Joint[],
) {
  const byId = new Map(catalog.map((e) => [e.id, e]));
  const refiltered = refilterPlan(toPlan(sessions), { catalog, equipmentIds, limitations });
  refiltered.sessions.forEach((session, i) =>
    session.slots.forEach((slot, j) => {
      const built = sessions[i].slots[j];
      built.exerciseId = slot.exerciseId;
      built.holeReason = slot.exerciseId ? undefined : (slot.holeReason ?? built.holeReason);
      if (slot.exerciseId) built.pattern = byId.get(slot.exerciseId)?.pattern ?? built.pattern;
    }),
  );
  fillHoles(sessions, catalog, equipmentIds, limitations);
  const available = availableExercises(catalog, equipmentIds, limitations);
  rebuildThinSessions(sessions, catalog, available);
  repairFloor(sessions, catalog, available);
  fitCeiling(sessions, catalog, available);
  return validateVolume(toPlan(sessions), catalog, available);
}

// Un hueco que la limitación dejó vacío se rellena con otro ejercicio de la misma región que el
// usuario puede hacer (equipo y ninguna zona limitada), aunque sea de otro patrón; así el plan no
// pierde un grupo que sí tiene ejercicios posibles (KTD20). Nunca carga una zona limitada.
function fillHoles(sessions: BuiltSession[], catalog: readonly Exercise[], equipmentIds: readonly string[], limitations: readonly Joint[]) {
  for (const session of sessions) {
    const used = new Set(session.slots.map((s) => s.exerciseId).filter((id): id is string => id !== null));
    for (const slot of session.slots) {
      if (slot.exerciseId !== null) continue;
      const candidate = catalog.find(
        (e) => e.region === slot.region && !used.has(e.id) && hasEquipment(e, equipmentIds) && !isExcludedByLimitations(e, limitations),
      );
      if (!candidate) continue;
      used.add(candidate.id);
      slot.exerciseId = candidate.id;
      slot.pattern = candidate.pattern;
      slot.holeReason = undefined;
    }
  }
}

// Ninguna sesión vacía (D68, decidido por Pablo el 18/11): si las limitaciones o el equipo dejan una
// sesión con menos de la mitad de sus huecos, se rehace el día con ejercicios posibles de cualquier
// región (por ejemplo, pierna en un día de torso con el hombro limitado). Se eligen primero los grupos
// con menos series en la semana y nunca se pasa el techo de 20 series por grupo (guardarraíl 4); si no
// cabe con sus series, se prueba con el mínimo de 2. Nunca carga una zona limitada (guardarraíl 6):
// solo usa `available`. El día rehecho pasa a llamarse "Cuerpo completo".
export function rebuildThinSessions(sessions: BuiltSession[], catalog: readonly Exercise[], available: readonly Exercise[]) {
  const byId = new Map(catalog.map((e) => [e.id, e]));
  const weekly = new Map<string, number>();
  const add = (exercise: Exercise, sets: number) => {
    for (const g of exercise.muscleGroups) weekly.set(g, (weekly.get(g) ?? 0) + sets);
  };
  for (const slot of sessions.flatMap((s) => s.slots)) {
    const e = slot.exerciseId ? byId.get(slot.exerciseId) : undefined;
    if (e) add(e, slot.sets);
  }
  const fits = (e: Exercise, sets: number) =>
    e.muscleGroups.every((g) => !(MAIN_MUSCLE_GROUPS as readonly string[]).includes(g) || (weekly.get(g) ?? 0) + sets <= MAX_WEEKLY_SETS_PER_GROUP);
  const load = (e: Exercise) => e.muscleGroups.reduce((sum, g) => sum + (weekly.get(g) ?? 0), 0);
  const filledNow = (session: BuiltSession) => session.slots.filter((s) => s.exerciseId !== null).length;
  // Baja de una en una las series del ejercicio más cargado que comparta un grupo lleno, hasta que
  // quepan `sets` de `e`. Si no se puede, deshace los cambios y devuelve false.
  const makeRoom = (e: Exercise, sets: number, except: BuiltSlot): boolean => {
    const changes: BuiltSlot[] = [];
    while (!fits(e, sets)) {
      const full = e.muscleGroups.filter((g) => (weekly.get(g) ?? 0) + sets > MAX_WEEKLY_SETS_PER_GROUP);
      const donor = sessions
        .flatMap((x) => x.slots)
        .filter((x) => x !== except && x.exerciseId !== null && x.sets > MIN_SETS_PER_EXERCISE)
        .filter((x) => byId.get(x.exerciseId!)?.muscleGroups.some((g) => full.includes(g)))
        .sort((a, b) => b.sets - a.sets)[0];
      if (!donor) {
        for (const x of changes) {
          x.sets += 1;
          add(byId.get(x.exerciseId!)!, 1);
        }
        return false;
      }
      donor.sets -= 1;
      add(byId.get(donor.exerciseId!)!, -1);
      changes.push(donor);
    }
    return true;
  };

  for (const session of sessions) {
    const filled = session.slots.filter((s) => s.exerciseId !== null).length;
    if (filled >= Math.ceil(session.slots.length / 2)) continue;
    const used = new Set(session.slots.map((s) => s.exerciseId).filter((id): id is string => id !== null));
    let rebuilt = false;
    for (const slot of session.slots) {
      if (slot.exerciseId !== null) continue;
      const ordered = available.filter((e) => !used.has(e.id)).sort((a, b) => load(a) - load(b));
      const full = ordered.find((e) => fits(e, slot.sets));
      const minimal = full ? undefined : ordered.find((e) => fits(e, MIN_SETS_PER_EXERCISE));
      // Sin margen en la semana: se hace sitio bajando series de otros ejercicios de esos grupos
      // (nunca por debajo de 2), pero solo para que el día no quede vacío.
      const roomy = full ?? minimal ?? (filledNow(session) === 0 ? ordered.find((e) => makeRoom(e, MIN_SETS_PER_EXERCISE, slot)) : undefined);
      const pick = roomy;
      if (!pick) continue;
      if (!full) slot.sets = MIN_SETS_PER_EXERCISE;
      Object.assign(slot, { exerciseId: pick.id, pattern: pick.pattern, region: pick.region, holeReason: undefined });
      used.add(pick.id);
      add(pick, slot.sets);
      rebuilt = true;
    }
    if (rebuilt && session.kind !== "cuerpo_completo") session.label = LABELS.cuerpo_completo;
  }
}

// Suelo de 2 sesiones por grupo (guardarraíl 4): la IA no ve las limitaciones (KTD19), así que
// puede elegir de forma que, tras aplicarlas, un grupo con ejercicios posibles quede en menos de 2
// sesiones. Se cambia, en una sesión que no lo trabaja, un ejercicio de la misma región por uno
// posible que sí lo trabaje; el cambio solo se queda si reduce los problemas del validador.
function repairFloor(sessions: BuiltSession[], catalog: readonly Exercise[], available: readonly Exercise[]) {
  const byId = new Map(catalog.map((e) => [e.id, e]));
  const issues = () => validateVolume(toPlan(sessions), catalog, available).issues;
  // Un techo que fitCeiling arreglará después (bajando series hasta 2) no cuenta como problema: con
  // el catálogo ampliado, un cambio que arregla el suelo a menudo pasa el techo de forma temporal.
  const ceilingFixable = (group: string) =>
    sessions.flatMap((s) => s.slots).filter((slot) => slot.exerciseId && byId.get(slot.exerciseId)?.muscleGroups.includes(group)).length *
      MIN_SETS_PER_EXERCISE <=
    MAX_WEEKLY_SETS_PER_GROUP;
  // Déficit: sesiones que faltan hasta el suelo en los grupos posibles, más los demás problemas.
  const score = () => {
    let deficit = 0;
    for (const issue of issues()) {
      if (issue.code === "techo_series_grupo" && ceilingFixable(issue.group)) continue;
      if (issue.code !== "suelo_frecuencia_grupo") {
        deficit += 10;
        continue;
      }
      const trained = sessions.filter((sess) =>
        sess.slots.some((slot) => slot.exerciseId && byId.get(slot.exerciseId)?.muscleGroups.includes(issue.group)),
      ).length;
      deficit += Math.max(0, 2 - trained);
    }
    return deficit;
  };
  for (let guard = 0; guard < 50; guard++) {
    const current = issues();
    const currentScore = score();
    const floor = current.find((i) => i.code === "suelo_frecuencia_grupo");
    if (!floor || floor.code !== "suelo_frecuencia_grupo") return;
    let improved = false;
    for (const session of sessions) {
      const trains = session.slots.some((slot) => slot.exerciseId && byId.get(slot.exerciseId)?.muscleGroups.includes(floor.group));
      if (trains) continue;
      const used = new Set(session.slots.map((slot) => slot.exerciseId));
      for (const slot of session.slots) {
        // Con el catálogo ampliado hay varios candidatos por región: se prueban en orden hasta dar con
        // uno que mejore (por ejemplo, uno que trabaje también el grupo del ejercicio que sustituye).
        const candidates = available.filter((e) => e.region === slot.region && e.muscleGroups.includes(floor.group) && !used.has(e.id));
        const before = { exerciseId: slot.exerciseId, pattern: slot.pattern, holeReason: slot.holeReason };
        for (const candidate of candidates) {
          Object.assign(slot, { exerciseId: candidate.id, pattern: candidate.pattern, holeReason: undefined });
          if (score() < currentScore) {
            improved = true;
            break;
          }
          Object.assign(slot, before);
        }
        if (improved) break;
      }
      if (improved) break;
    }
    if (!improved) return;
  }
}

function toPlan(sessions: BuiltSession[]): Plan {
  return {
    sessions: sessions.map((s) => ({
      slots: s.slots.map((slot) => ({ exerciseId: slot.exerciseId, sets: slot.sets, holeReason: slot.holeReason })),
    })),
  };
}

// Baja series de uno en uno (nunca por debajo de 2) donde un grupo pasa del techo de 20 por semana.
function fitCeiling(sessions: BuiltSession[], catalog: readonly Exercise[], available: readonly Exercise[]) {
  const byId = new Map(catalog.map((e) => [e.id, e]));
  for (let guard = 0; guard < 200; guard++) {
    const over = validateVolume(toPlan(sessions), catalog, available).issues.find((i) => i.code === "techo_series_grupo");
    if (!over || over.code !== "techo_series_grupo") return;
    const candidates = sessions
      .flatMap((s) => s.slots)
      .filter((slot) => slot.exerciseId !== null && slot.sets > MIN_SETS_PER_EXERCISE)
      .filter((slot) => byId.get(slot.exerciseId!)?.muscleGroups.includes(over.group));
    if (candidates.length === 0) return;
    const biggest = candidates.reduce((a, b) => (b.sets > a.sets ? b : a));
    biggest.sets -= 1;
  }
}
