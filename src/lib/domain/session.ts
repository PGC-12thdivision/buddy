import { calibrationStep, MAX_CALIBRATION_SETS, type Rir } from "./calibration";
import type { ExerciseSessionLog } from "./progression";
import type { EquipmentType } from "./types";

// Sesión del día (PRD §8–§10; plan.md U7). Funciones puras que comparten el servidor y el cliente
// (D28): historial por ejercicio, estado de la calibración a partir de las series guardadas, carga de
// trabajo al cerrar la sesión y minutos estimados. La IA no interviene (guardarraíl 3).

export type LoggedSet = {
  sessionId: string;
  exerciseId: string;
  setIndex: number;
  weightKg: number;
  reps: number;
  rir: number | null;
  // "detenida": el ejercicio se paró hoy (Molestia). Estado neutro, sin motivo ni zona (D65).
  status: "hecha" | "saltada" | "detenida";
  createdAt: string;
};

// Minutos por serie con su descanso: la misma regla que reparte las series del plan (D53).
export const MINUTES_PER_SET = 2.5;

export function estimatedMinutes(totalSets: number): number {
  return Math.round((totalSets * MINUTES_PER_SET) / 5) * 5;
}

// Historial de un ejercicio, una entrada por sesión en orden cronológico. La carga de la sesión es la
// de trabajo de sus series hechas. Una sesión con Molestia en ese ejercicio (marca o fila "detenida",
// que existe aunque no haya consentimiento) lleva la marca y nunca sube (guardarraíl 7; D65).
export function exerciseHistory(
  sets: readonly LoggedSet[],
  exerciseId: string,
  sessionOrder: readonly string[],
  discomfortSessions: ReadonlySet<string>,
): ExerciseSessionLog[] {
  return sessionOrder.flatMap((sessionId) => {
    const own = sets
      .filter((s) => s.sessionId === sessionId && s.exerciseId === exerciseId)
      .sort((a, b) => a.setIndex - b.setIndex);
    const discomfort = discomfortSessions.has(sessionId) || own.some((s) => s.status === "detenida");
    const counted = own.filter((s) => s.status !== "detenida");
    if (counted.length === 0 && !discomfort) return [];
    return [
      {
        loadKg: workLoad(counted) ?? counted.at(-1)?.weightKg ?? 0,
        sets: counted.map((s) => ({ reps: s.reps, skipped: s.status === "saltada" })),
        discomfort,
      },
    ];
  });
}

// Carga de trabajo de un grupo de series: la más repetida entre las hechas; si empatan, la de la
// serie más reciente. Bajar peso en la última serie no hunde la carga (revisión de guardarraíles).
function workLoad(sets: readonly Pick<LoggedSet, "setIndex" | "weightKg" | "status">[]): number | null {
  const done = sets.filter((s) => s.status === "hecha").sort((a, b) => a.setIndex - b.setIndex);
  if (done.length === 0) return null;
  const counts = new Map<number, number>();
  for (const s of done) counts.set(s.weightKg, (counts.get(s.weightKg) ?? 0) + 1);
  let best = done[done.length - 1].weightKg;
  for (const s of [...done].reverse()) if ((counts.get(s.weightKg) ?? 0) > (counts.get(best) ?? 0)) best = s.weightKg;
  return best;
}

export type CalibrationState =
  | { done: false; nextSetIndex: number; nextLoadKg: number }
  | { done: true; fixedLoadKg: number };

// Estado de la calibración de un ejercicio a partir de sus series de calibración guardadas, en orden.
// El servidor lo recalcula al guardar cada serie: la carga fijada nunca la decide el cliente.
export function calibrationState(
  saved: readonly { setIndex: number; weightKg: number; rir: number | null; reps: number }[],
  startLoadKg: number,
  targetReps: number,
  equipment: EquipmentType,
): CalibrationState {
  let nextLoadKg = startLoadKg;
  const ordered = [...saved].sort((a, b) => a.setIndex - b.setIndex);
  for (const [i, set] of ordered.entries()) {
    const step = calibrationStep(
      {
        setNumber: i + 1,
        loadKg: set.weightKg,
        rir: Math.min(Math.max(set.rir ?? 0, 0), 4) as Rir,
        reachedTargetReps: set.reps >= targetReps,
      },
      equipment,
    );
    if (step.done) return { done: true, fixedLoadKg: step.nextLoadKg };
    nextLoadKg = step.nextLoadKg;
  }
  return { done: false, nextSetIndex: ordered.length + 1, nextLoadKg };
}

export { MAX_CALIBRATION_SETS };

// Carga de trabajo tras la sesión: la más repetida entre las series hechas. Con Molestia (o una fila
// "detenida"), o sin series hechas, se queda como estaba (guardarraíl 7: nunca se empuja).
export function workingWeightAfter(
  current: number | null,
  sets: readonly Pick<LoggedSet, "setIndex" | "weightKg" | "status">[],
  discomfort: boolean,
): number | null {
  if (discomfort || sets.some((s) => s.status === "detenida")) return current;
  return workLoad(sets) ?? current;
}

// Molestia repetida (diseño D16): el ejercicio ya tuvo Molestia en la sesión anterior en la que se hizo.
export function isRepeatedDiscomfort(previousSessionWithExercise: string | null, discomfortSessions: ReadonlySet<string>): boolean {
  return previousSessionWithExercise !== null && discomfortSessions.has(previousSessionWithExercise);
}

// Cantidades con coma decimal y sin ceros sobrantes ("42,5", "45").
export function formatKg(kg: number): string {
  return Number.isInteger(kg) ? String(kg) : kg.toFixed(2).replace(/0+$/, "").replace(".", ",");
}
