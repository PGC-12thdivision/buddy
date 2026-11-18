import type { Joint } from "./types";

// Cribado (PRD §13; guardarraíl 5): 7 preguntas con los temas del PAR-Q+ y embarazo.
// Cualquier «Sí» bloquea, salvo la pregunta articular, que obliga a marcar la zona en limitaciones.

export const SCREENING_QUESTIONS = [
  "cardiaco",
  "dolor_toracico",
  "mareos",
  "cronica",
  "medicacion",
  "articular",
  "supervision",
  "embarazo",
] as const;
export type ScreeningQuestion = (typeof SCREENING_QUESTIONS)[number];

// true = «Sí», false = «No». Una pregunta ausente no es «No».
export type ScreeningAnswers = Partial<Record<ScreeningQuestion, boolean>>;

export type ScreeningResult = { status: "apto" | "bloqueado" | "requiere_zona" | "incompleto" };

export function evaluateScreening(answers: ScreeningAnswers, limitations: readonly Joint[]): ScreeningResult {
  if (SCREENING_QUESTIONS.some((q) => typeof answers[q] !== "boolean")) return { status: "incompleto" };
  if (SCREENING_QUESTIONS.some((q) => q !== "articular" && answers[q] === true)) return { status: "bloqueado" };
  if (answers.articular === true && limitations.length === 0) return { status: "requiere_zona" };
  return { status: "apto" };
}
