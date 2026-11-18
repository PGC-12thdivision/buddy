import type { Focus, Region } from "./types";

// Plantilla determinista por días (PRD §7): la IA no decide la estructura, solo rellena los huecos.
// 2–3 días: cuerpo completo; 4–5 días: torso y pierna alternos.

export type Days = 2 | 3 | 4 | 5;
export type SessionKind = "cuerpo_completo" | "torso" | "pierna";

export type TemplateSlot = {
  region: Region;
  sets: number;
  repMin: number;
  repMax: number;
  // Solo en «Más fuerza»: el ejercicio principal va primero (PRD §7).
  principal: boolean;
};

export type TemplateSession = { kind: SessionKind; slots: TemplateSlot[] };
export type Template = { sessions: TemplateSession[] };

type Range = { min: number; max: number };
export type FocusParams = {
  weeklySets: Range;
  reps: Range;
  mainReps: Range | null;
  cardioBlock: boolean;
};

// Tabla de parámetros por foco del PRD §7 ([propuesta] sobre ACSM 2026 y 2009).
const FOCUS_PARAMS: Record<Focus, FocusParams> = {
  equilibrado: { weeklySets: { min: 10, max: 14 }, reps: { min: 8, max: 12 }, mainReps: null, cardioBlock: false },
  fuerza: { weeklySets: { min: 10, max: 14 }, reps: { min: 8, max: 12 }, mainReps: { min: 5, max: 8 }, cardioBlock: false },
  musculo: { weeklySets: { min: 14, max: 20 }, reps: { min: 8, max: 15 }, mainReps: null, cardioBlock: false },
  grasa: { weeklySets: { min: 10, max: 14 }, reps: { min: 8, max: 12 }, mainReps: null, cardioBlock: true },
};

export const focusParams = (focus: Focus): FocusParams => FOCUS_PARAMS[focus];

// Series por defecto de cada hueco; el validador de topes (volume.ts) tiene la última palabra.
const DEFAULT_SETS = 3;

const FULL_BODY: Region[] = [
  "empuje_inferior",
  "traccion_inferior",
  "empuje_superior_horizontal",
  "traccion_superior_horizontal",
  "empuje_superior_vertical",
  "traccion_superior_vertical",
];
const TORSO: Region[] = [
  "empuje_superior_horizontal",
  "traccion_superior_horizontal",
  "empuje_superior_vertical",
  "traccion_superior_vertical",
];
const PIERNA: Region[] = ["empuje_inferior", "traccion_inferior", "empuje_inferior", "traccion_inferior"];

const REGIONS: Record<SessionKind, Region[]> = { cuerpo_completo: FULL_BODY, torso: TORSO, pierna: PIERNA };

function sessionKinds(days: Days): SessionKind[] {
  if (days <= 3) return Array<SessionKind>(days).fill("cuerpo_completo");
  return Array.from({ length: days }, (_, i) => (i % 2 === 0 ? "torso" : "pierna"));
}

export function buildTemplate(days: Days, focus: Focus): Template {
  const params = focusParams(focus);
  return {
    sessions: sessionKinds(days).map((kind) => ({
      kind,
      slots: REGIONS[kind].map((region, index) => {
        const principal = params.mainReps !== null && index === 0;
        const reps = principal && params.mainReps ? params.mainReps : params.reps;
        return { region, sets: DEFAULT_SETS, repMin: reps.min, repMax: reps.max, principal };
      }),
    })),
  };
}
