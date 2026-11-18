// Tipos planos del dominio (plan.md, U3; KTD5). El esquema de U2 se mapea a ellos; aquí no hay
// nada de base de datos ni de red.

// Zonas de limitación (PRD §5, pantalla 8). "Ninguna" es una lista vacía.
export const JOINTS = [
  "hombro",
  "codo",
  "muneca",
  "cuello_espalda_alta",
  "espalda_baja",
  "cadera",
  "rodilla",
  "tobillo",
] as const;
export type Joint = (typeof JOINTS)[number];

export type Focus = "equilibrado" | "fuerza" | "musculo" | "grasa";

// PRD §5, pantalla 3.
export type Experience = "nunca" | "menos_6_meses" | "6_meses_2_anos" | "mas_2_anos";

// Región del hueco (PRD §6): empuje/tracción × superior/inferior; horizontal/vertical en superior.
export type Region =
  | "empuje_superior_horizontal"
  | "empuje_superior_vertical"
  | "traccion_superior_horizontal"
  | "traccion_superior_vertical"
  | "empuje_inferior"
  | "traccion_inferior";

// Grupos principales a los que se aplican el suelo de 2 veces por semana y el techo de 20 series
// (guardarraíl 4). Un ejercicio puede listar otros grupos; esos no se validan.
export const MAIN_MUSCLE_GROUPS = [
  "pecho",
  "espalda",
  "hombros",
  "cuadriceps",
  "isquiotibiales",
  "gluteos",
] as const;
export type MainMuscleGroup = (typeof MAIN_MUSCLE_GROUPS)[number];

export type EquipmentType = {
  id: string;
  incrementKg: number;
  minKg: number;
};

export type Exercise = {
  id: string;
  equipmentTypeId: string;
  pattern: string;
  region: Region;
  // El primero es el grupo principal del ejercicio (el que se usa para buscar alternativas).
  muscleGroups: string[];
  joints: Joint[];
  calibrationLoadKg: number;
};

// Motivo cerrado de un hueco vacío (plan.md, modelo de datos; diseño §11.27): nunca la articulación.
export type HoleReason = "sin_alternativa_limitacion" | "sin_alternativa_equipo";

export type PlanSlot = {
  exerciseId: string | null;
  sets: number;
  holeReason?: HoleReason;
};

export type PlanSession = { slots: PlanSlot[] };
export type Plan = { sessions: PlanSession[] };
