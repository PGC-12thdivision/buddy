import type { Exercise, Joint } from "./types";

// Exclusión determinista por etiquetas de articulaciones (guardarraíl 6; plan.md R5).
// Un ejercicio queda excluido si carga cualquiera de las zonas limitadas. «Ninguna» = lista vacía.

export function isExcludedByLimitations(exercise: Exercise, limitations: readonly Joint[]): boolean {
  return exercise.joints.some((joint) => limitations.includes(joint));
}

// Contribución leve: zonas limitadas que el ejercicio solo implica de forma leve (jointsLight). Nunca
// excluye; la sesión lo usa para avisar. Vacío si el ejercicio ya está excluido (eso manda).
export function lightMatches(exercise: Exercise, limitations: readonly Joint[]): Joint[] {
  if (isExcludedByLimitations(exercise, limitations)) return [];
  return (exercise.jointsLight ?? []).filter((joint) => limitations.includes(joint));
}

export function hasEquipment(exercise: Exercise, equipmentIds: readonly string[]): boolean {
  return equipmentIds.includes(exercise.equipmentTypeId);
}

// Subconjunto posible para el usuario: equipo disponible y ninguna zona limitada.
export function availableExercises(
  catalog: readonly Exercise[],
  equipmentIds: readonly string[],
  limitations: readonly Joint[],
): Exercise[] {
  return catalog.filter((e) => hasEquipment(e, equipmentIds) && !isExcludedByLimitations(e, limitations));
}
