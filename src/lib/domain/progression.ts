import type { EquipmentType } from "./types";

// Doble progresión (PRD §10; guardarraíles 3 y 7). Calcula la precarga de la siguiente sesión de
// un ejercicio a partir de su historial. La IA nunca toca cargas.
// - Todas las series en el techo del rango en las dos últimas sesiones, con la carga actual:
//   sube un salto y vuelve al suelo del rango.
// - No llegar al suelo en una serie: repite carga; en las dos últimas sesiones: baja un salto.
// - Las series saltadas no cuentan; una sesión sin series hechas se ignora.
// - Molestia en la última sesión: nunca sube (tampoco baja).

export type SetLog = { reps: number; skipped: boolean };
export type ExerciseSessionLog = { loadKg: number; sets: SetLog[]; discomfort: boolean };

export type ProgressionInput = {
  currentLoadKg: number;
  repRange: { min: number; max: number };
  // Sesiones de este ejercicio en orden cronológico; la última es la más reciente.
  history: ExerciseSessionLog[];
};

export type Prescription = { loadKg: number; reps: number };

export function nextPrescription(input: ProgressionInput, equipment: EquipmentType): Prescription {
  const { currentLoadKg: load, repRange } = input;
  const sessions = input.history
    .map((s) => ({ ...s, reps: s.sets.filter((set) => !set.skipped).map((set) => set.reps) }))
    .filter((s) => s.reps.length > 0);

  const last = sessions[sessions.length - 1];
  if (!last) return { loadKg: load, reps: repRange.min };

  const lastTwo = sessions.slice(-2);
  const bothAtLoad = lastTwo.length === 2 && lastTwo.every((s) => s.loadKg === load);
  const atTop = (reps: number[]) => reps.every((r) => r >= repRange.max);
  const belowFloor = (reps: number[]) => reps.some((r) => r < repRange.min);

  if (!last.discomfort && bothAtLoad && lastTwo.every((s) => atTop(s.reps))) {
    return { loadKg: load + equipment.incrementKg, reps: repRange.min };
  }
  if (!last.discomfort && bothAtLoad && lastTwo.every((s) => belowFloor(s.reps))) {
    return { loadKg: Math.max(load - equipment.incrementKg, equipment.minKg), reps: repRange.min };
  }
  const lowest = Math.min(...last.reps);
  return { loadKg: load, reps: Math.min(Math.max(lowest, repRange.min), repRange.max) };
}
