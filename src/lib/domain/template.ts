import { EXTRA_REGIONS, type ExtraRegion, type Focus, type Region } from "./types";
import { MIN_SETS_PER_EXERCISE } from "./volume";

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

// Huecos extra de complemento (catálogo ampliado, 18/11), en orden de preferencia. Solo entran si,
// después de las series de los huecos principales, sobran minutos para al menos 2 series más. Nunca
// quitan series a los huecos principales.
const EXTRAS: Record<SessionKind, ExtraRegion[]> = {
  cuerpo_completo: ["core", "brazo"],
  torso: ["brazo", "brazo", "core"],
  pierna: ["core"],
};
const EXTRA_MAX_SETS = 3;

export const isExtraRegion = (region: string): boolean => (EXTRA_REGIONS as readonly string[]).includes(region);

// Unas 2,5 minutos por serie con su descanso.
const MINUTES_PER_SET = 2.5;

// Series de cada hueco principal según los minutos y el foco.
export function setsPerSlot(slotCount: number, minutes: number, focus: Focus): number {
  const maxPerSession = Math.floor(minutes / MINUTES_PER_SET);
  const ceiling = focus === "musculo" ? 5 : 4;
  return Math.min(Math.max(Math.floor(maxPerSession / slotCount), MIN_SETS_PER_EXERCISE), ceiling);
}

function sessionKinds(days: Days): SessionKind[] {
  if (days <= 3) return Array<SessionKind>(days).fill("cuerpo_completo");
  return Array.from({ length: days }, (_, i) => (i % 2 === 0 ? "torso" : "pierna"));
}

// Sin `minutes`, solo los huecos principales (así se comportaba antes del catálogo ampliado).
export function buildTemplate(days: Days, focus: Focus, minutes?: number): Template {
  const params = focusParams(focus);
  return {
    sessions: sessionKinds(days).map((kind) => {
      const slots: TemplateSlot[] = REGIONS[kind].map((region, index) => {
        const principal = params.mainReps !== null && index === 0;
        const reps = principal && params.mainReps ? params.mainReps : params.reps;
        return { region, sets: DEFAULT_SETS, repMin: reps.min, repMax: reps.max, principal };
      });
      if (minutes !== undefined) {
        const mainCount = slots.length;
        let leftover = Math.floor(minutes / MINUTES_PER_SET) - setsPerSlot(mainCount, minutes, focus) * mainCount;
        for (const region of EXTRAS[kind]) {
          if (leftover < MIN_SETS_PER_EXERCISE) break;
          const sets = Math.min(EXTRA_MAX_SETS, leftover);
          slots.push({ region, sets, repMin: params.reps.min, repMax: params.reps.max, principal: false });
          leftover -= sets;
        }
      }
      return { kind, slots };
    }),
  };
}
