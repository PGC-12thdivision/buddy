import type { EquipmentType, Experience } from "./types";

// Calibración (PRD §8; diseño §11.26; guardarraíl 3). La IA no interviene.

const atLeastMin = (kg: number, equipment: EquipmentType) => Math.max(kg, equipment.minKg);

// Carga de la primera serie: la de calibración del catálogo, ajustada por experiencia.
export function calibrationStartLoad(calibrationLoadKg: number, equipment: EquipmentType, experience: Experience): number {
  const steps = experience === "nunca" || experience === "menos_6_meses" ? -1 : experience === "mas_2_anos" ? 1 : 0;
  return atLeastMin(calibrationLoadKg + steps * equipment.incrementKg, equipment);
}

export const MAX_CALIBRATION_SETS = 3;

// «¿Cuántas más podrías haber hecho?»: 0 · 1 · 2 · 3 · 4+ (4 = 4+).
export type Rir = 0 | 1 | 2 | 3 | 4;

export type CalibrationSet = {
  setNumber: number;
  loadKg: number;
  rir: Rir;
  reachedTargetReps: boolean;
};

export type CalibrationStep = { action: "subir" | "bajar" | "fijar"; nextLoadKg: number; done: boolean };

// 4+ sube un salto; 0–1 o no llegar baja uno; 2–3 fija. La tercera serie fija su carga pase lo que pase.
export function calibrationStep(set: CalibrationSet, equipment: EquipmentType): CalibrationStep {
  if (set.setNumber >= MAX_CALIBRATION_SETS) return { action: "fijar", nextLoadKg: set.loadKg, done: true };
  if (!set.reachedTargetReps || set.rir <= 1) {
    return { action: "bajar", nextLoadKg: atLeastMin(set.loadKg - equipment.incrementKg, equipment), done: false };
  }
  if (set.rir >= 4) return { action: "subir", nextLoadKg: set.loadKg + equipment.incrementKg, done: false };
  return { action: "fijar", nextLoadKg: set.loadKg, done: true };
}
