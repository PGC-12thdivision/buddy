import { MAIN_MUSCLE_GROUPS, type Exercise, type MainMuscleGroup, type Plan } from "./types";

// Validador único de topes de volumen (guardarraíl 4; plan.md R5, R6, KTD20). Lo usan todas las
// salidas de IA y el refiltrado. Reglas:
// - mínimo 2 series por ejercicio;
// - techo de 20 series por grupo principal y semana;
// - suelo de 2 sesiones por semana por grupo principal, solo si el grupo tiene algún ejercicio
//   posible con el equipo y las limitaciones del usuario (KTD20). Si no, el hueco queda con motivo.
// Cada serie cuenta entera para cada grupo que lista el ejercicio.

export const MIN_SETS_PER_EXERCISE = 2;
export const MAX_WEEKLY_SETS_PER_GROUP = 20;
export const MIN_WEEKLY_FREQUENCY = 2;

export type VolumeIssue =
  | { code: "minimo_series_ejercicio"; exerciseId: string }
  | { code: "techo_series_grupo"; group: MainMuscleGroup }
  | { code: "suelo_frecuencia_grupo"; group: MainMuscleGroup };

export type VolumeResult = { ok: boolean; issues: VolumeIssue[] };

export function validateVolume(
  plan: Plan,
  catalog: readonly Exercise[],
  // Subconjunto posible del usuario (exclusion.ts, availableExercises).
  available: readonly Exercise[],
): VolumeResult {
  const issues: VolumeIssue[] = [];
  const byId = new Map(catalog.map((e) => [e.id, e]));
  const weeklySets = new Map<string, number>();
  const sessionsTrained = new Map<string, number>();

  for (const session of plan.sessions) {
    const trainedHere = new Set<string>();
    for (const slot of session.slots) {
      if (slot.exerciseId === null) continue;
      if (slot.sets < MIN_SETS_PER_EXERCISE) {
        issues.push({ code: "minimo_series_ejercicio", exerciseId: slot.exerciseId });
      }
      for (const group of byId.get(slot.exerciseId)?.muscleGroups ?? []) {
        weeklySets.set(group, (weeklySets.get(group) ?? 0) + slot.sets);
        trainedHere.add(group);
      }
    }
    for (const group of trainedHere) sessionsTrained.set(group, (sessionsTrained.get(group) ?? 0) + 1);
  }

  for (const group of MAIN_MUSCLE_GROUPS) {
    if ((weeklySets.get(group) ?? 0) > MAX_WEEKLY_SETS_PER_GROUP) issues.push({ code: "techo_series_grupo", group });
    const possible = available.some((e) => e.muscleGroups.includes(group));
    if (possible && (sessionsTrained.get(group) ?? 0) < MIN_WEEKLY_FREQUENCY) {
      issues.push({ code: "suelo_frecuencia_grupo", group });
    }
  }

  return { ok: issues.length === 0, issues };
}
