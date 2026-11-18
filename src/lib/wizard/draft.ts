import { z } from "zod";
import { answersSchema, type WizardAnswers } from "./answers";
import { wizardEventSchema, type WizardEvent } from "./events";

// Borrador del wizard en el dispositivo hasta el registro (plan.md KTD4). Nunca lleva datos de
// salud: al leer se descarta todo campo que no sea una respuesta permitida, aunque alguien lo
// haya escrito a mano. Los pasos del embudo se guardan aquí porque antes del registro no hay
// `user_id`; el registro los vuelca a `events`.

export const DRAFT_KEY = "buddy.wizard.v1";
const MAX_EVENTS = 40;

type DraftStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export type DraftEvent = WizardEvent & { at: string };
export type Draft = { answers: Partial<WizardAnswers>; events: DraftEvent[] };

const draftEventSchema = wizardEventSchema.extend({ at: z.iso.datetime() });

function initialDraft(): Draft {
  return { answers: { focus: "equilibrado" }, events: [] };
}

// Cada campo se valida por separado: uno no válido se pierde sin arrastrar a los demás.
function pickAnswers(raw: unknown): Partial<WizardAnswers> {
  if (typeof raw !== "object" || raw === null) return {};
  const source = raw as Record<string, unknown>;
  const answers: Record<string, unknown> = {};
  for (const [key, schema] of Object.entries(answersSchema.shape)) {
    const parsed = schema.safeParse(source[key]);
    if (parsed.success) answers[key] = parsed.data;
  }
  return answers as Partial<WizardAnswers>;
}

export function loadDraft(storage: DraftStorage): Draft {
  let raw: unknown;
  try {
    raw = JSON.parse(storage.getItem(DRAFT_KEY) ?? "null");
  } catch {
    return initialDraft();
  }
  if (typeof raw !== "object" || raw === null) return initialDraft();
  const source = raw as { answers?: unknown; events?: unknown };
  const events = z.array(draftEventSchema).safeParse(source.events);
  return {
    answers: pickAnswers(source.answers),
    events: events.success ? events.data.slice(-MAX_EVENTS) : [],
  };
}

export function saveDraft(storage: DraftStorage, draft: Draft): void {
  const clean: Draft = { answers: pickAnswers(draft.answers), events: draft.events.slice(-MAX_EVENTS) };
  storage.setItem(DRAFT_KEY, JSON.stringify(clean));
}

export function clearDraft(storage: DraftStorage): void {
  storage.removeItem(DRAFT_KEY);
}

export function recordStep(draft: Draft, name: WizardEvent["name"], step: WizardEvent["step"], now: Date): Draft {
  return { ...draft, events: [...draft.events, { name, step, at: now.toISOString() }].slice(-MAX_EVENTS) };
}

// Email del registro, solo en esta pestaña, para "Revisa tu correo" y "Reenviar".
export const EMAIL_KEY = "buddy.registro.email";
