import { z } from "zod";

// Respuestas del wizard sin datos de salud (PRD §5, pantallas 2–6; plan.md KTD4).
// Las comparten el borrador del dispositivo, el registro y el cambio desde el resumen.

export const FOCUS_OPTIONS = ["equilibrado", "fuerza", "musculo", "grasa"] as const;
export const EXPERIENCE_OPTIONS = ["nunca", "menos_6_meses", "6_meses_2_anos", "mas_2_anos"] as const;
export const DAYS_OPTIONS = [2, 3, 4, 5] as const;
export const MINUTES_OPTIONS = [30, 45, 60, 75] as const;
export const GYM_PRESETS = ["completo", "basico", "peso_libre"] as const;

export type GymPreset = (typeof GYM_PRESETS)[number];

// IDs del catálogo: el servidor comprueba después que existen.
const catalogId = z.string().regex(/^[a-z0-9_]{1,40}$/);

export const answersSchema = z.object({
  focus: z.enum(FOCUS_OPTIONS),
  experience: z.enum(EXPERIENCE_OPTIONS),
  daysPerWeek: z.union(DAYS_OPTIONS.map((n) => z.literal(n))),
  minutesPerSession: z.union(MINUTES_OPTIONS.map((n) => z.literal(n))),
  sports: z.array(catalogId).max(20),
  gymPreset: z.enum(GYM_PRESETS),
  equipmentTypeIds: z.array(catalogId).min(1).max(60),
});

export type WizardAnswers = z.infer<typeof answersSchema>;

// Textos de la UI (sistema §11.12).
export const FOCUS_LABELS: Record<WizardAnswers["focus"], string> = {
  equilibrado: "Equilibrado",
  fuerza: "Más fuerza",
  musculo: "Más músculo",
  grasa: "Perder grasa",
};

export const EXPERIENCE_LABELS: Record<WizardAnswers["experience"], string> = {
  nunca: "Nunca he entrenado con máquinas",
  menos_6_meses: "Menos de 6 meses",
  "6_meses_2_anos": "De 6 meses a 2 años",
  mas_2_anos: "Más de 2 años",
};

export const GYM_PRESET_LABELS: Record<GymPreset, string> = {
  completo: "Completo",
  basico: "Básico",
  peso_libre: "Solo peso libre",
};

// Equipo marcado por cada preset (los IDs son los del catálogo semilla de U2).
// "Completo" marca todo el catálogo; el usuario quita lo que no tenga.
export const BASIC_PRESET_EQUIPMENT = [
  "prensa_piernas",
  "extension_cuadriceps",
  "curl_femoral_sentado",
  "jalon",
  "remo_polea",
  "polea_doble",
  "press_pecho_maquina",
  "press_hombro_maquina",
  "mancuernas",
  "banco",
  "esterilla",
  "cinta",
  "bici_estatica",
  "eliptica",
] as const;

export const FREE_WEIGHT_PRESET_EQUIPMENT = ["mancuernas", "barra", "barra_z", "banco", "rack", "kettlebells", "esterilla"] as const;

export function presetEquipment(preset: GymPreset, catalogIds: readonly string[]): string[] {
  if (preset === "completo") return [...catalogIds];
  const wanted: readonly string[] = preset === "basico" ? BASIC_PRESET_EQUIPMENT : FREE_WEIGHT_PRESET_EQUIPMENT;
  return catalogIds.filter((id) => wanted.includes(id));
}

// Plantilla que se anuncia en vivo en "Tu semana" (PRD §7).
export function templateHint(days: number): string {
  return days <= 3 ? "Te montamos cuerpo completo" : "Te montamos torso y pierna alternos";
}
