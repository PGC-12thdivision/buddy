import { z } from "zod";
import { hasEquipment } from "@/lib/domain/exclusion";
import { assemblePlan, type AssembleResult, type BuiltPlan } from "@/lib/domain/plan-build";
import { buildPromptPayload } from "@/lib/domain/prompt-fields";
import type { Template } from "@/lib/domain/template";
import type { Exercise, Focus, Joint } from "@/lib/domain/types";

// Generación del plan inicial con IA (plan.md U5; KTD6, KTD7, KTD19; D53–D56). Sin dependencias de
// red: la llamada al modelo entra como función, para poder probar cada resultado sin la API.

export const PLAN_MODELS = ["claude-sonnet-5-5", "claude-haiku-5-5"] as const;
export type PlanModel = (typeof PLAN_MODELS)[number];

// Modelo del plan inicial: Sonnet 5.5 por defecto (KTD7); lo confirma la evaluación de scripts/eval-plan.ts.
export const PLAN_MODEL: PlanModel = "claude-sonnet-5-5";

// Precios por millón de tokens (entrada, salida) de KTD7, para el coste aproximado de ai_calls.
const PRICES: Record<PlanModel, { input: number; output: number }> = {
  "claude-sonnet-5-5": { input: 2, output: 10 },
  "claude-haiku-5-5": { input: 0.1, output: 0.5 },
};

export const costUsd = (model: PlanModel, inputTokens: number, outputTokens: number) =>
  Number(((inputTokens * PRICES[model].input + outputTokens * PRICES[model].output) / 1_000_000).toFixed(6));

// Hasta 2 reintentos tras el primer intento (KTD6).
export const MAX_ATTEMPTS = 3;

// Esquema de salida: un enum fijo con TODOS los IDs del catálogo, el mismo para todos los usuarios
// (KTD6). No depende del equipo ni de las limitaciones, así que no revela nada; el código
// comprueba después que cada ID esté en el subconjunto ofrecido.
export function planOutputSchema(catalogIds: readonly string[]) {
  const ids = z.enum(catalogIds as [string, ...string[]]);
  return z.object({
    sesiones: z.array(z.object({ huecos: z.array(z.object({ ejercicio: ids })) })),
  });
}
export type PlanOutput = z.infer<ReturnType<typeof planOutputSchema>>;

// Instrucciones fijas. Nada condicional según el usuario: con o sin limitaciones, el prompt es el
// mismo byte a byte (KTD19).
export const SYSTEM_PROMPT = `Eres el generador de planes de BUDDY, una app para personas que entrenan por su cuenta en el gimnasio.
Recibes un JSON con el catálogo de ejercicios disponibles en su gimnasio y su perfil (foco, días, minutos y deportes), y la estructura fija de la semana: sesiones y huecos, cada hueco con su región.
Tu única tarea es elegir, para cada hueco, un ejercicio del catálogo cuya "region" coincida con la del hueco.
Reglas:
- Usa solo IDs del catálogo recibido. No repitas un ejercicio dentro de la misma sesión.
- Mantén exactamente el número de sesiones y de huecos, en el mismo orden.
- Prefiere máquinas y ejercicios fáciles de aprender; varía los ejercicios entre sesiones cuando el catálogo lo permita.
- Si hay deportes, evita cargar en exceso los mismos grupos que ese deporte ya trabaja.
- Cada grupo principal (pecho, espalda, hombros, cuadriceps, isquiotibiales, gluteos) debe aparecer en al menos 2 sesiones de la semana: usa el campo "grupos" de cada ejercicio.
- No decides series, repeticiones ni pesos: eso lo calcula la app.
Responde solo con el JSON pedido.`;

export type PlanProfile = { focus: Focus; daysPerWeek: number; minutesPerSession: number; sports: string[] };

export function buildUserPrompt(template: Template, profile: PlanProfile, catalog: readonly Exercise[], equipmentIds: readonly string[]): string {
  const payload = buildPromptPayload({
    profile: { foco: profile.focus, dias: profile.daysPerWeek, minutos: profile.minutesPerSession, deportes: profile.sports },
    catalog,
    equipmentIds,
  });
  const estructura = template.sessions.map((s, i) => ({
    sesion: i + 1,
    tipo: s.kind,
    huecos: s.slots.map((slot, j) => ({ hueco: j + 1, region: slot.region, principal: slot.principal })),
  }));
  return `Datos:\n${payload}\n\nEstructura de la semana:\n${JSON.stringify(estructura)}`;
}

// Resultado de una llamada al modelo, ya traducido desde el SDK por quien la hace.
export type ModelReply =
  | { kind: "parsed"; output: PlanOutput; inputTokens: number; outputTokens: number }
  | { kind: "refused" | "empty"; inputTokens: number; outputTokens: number }
  | { kind: "connection" };

export type CallModel = (request: { model: PlanModel; system: string; user: string; schema: ReturnType<typeof planOutputSchema> }) => Promise<ModelReply>;

export type GenerateInput = {
  model: PlanModel;
  callModel: CallModel;
  template: Template;
  profile: PlanProfile;
  catalog: readonly Exercise[];
  equipmentIds: readonly string[];
  limitations: readonly Joint[];
};

export type AttemptLog = {
  outcome: "ok" | "validation_failed" | "refused" | "empty" | "connection";
  inputTokens: number;
  outputTokens: number;
  // Código cerrado del motivo cuando la validación falla (para el log y la evaluación; nunca texto libre).
  reason?: string;
};

export type GenerateResult =
  | { status: "ok"; plan: BuiltPlan; attempts: AttemptLog[] }
  | { status: "validation_failed" | "refused" | "empty" | "connection"; attempts: AttemptLog[] };

export async function generatePlan(input: GenerateInput): Promise<GenerateResult> {
  const { model, callModel, template, profile, catalog, equipmentIds, limitations } = input;
  const schema = planOutputSchema(catalog.map((e) => e.id));
  // A la IA solo se le piden los huecos con algún ejercicio posible con el equipo; los demás quedan
  // vacíos con motivo de equipo (un hueco imposible haría fallar cualquier respuesta).
  const offeredRegions = new Set(catalog.filter((e) => hasEquipment(e, equipmentIds)).map((e) => e.region));
  const aiTemplate: Template = {
    sessions: template.sessions.map((s) => ({ ...s, slots: s.slots.filter((slot) => offeredRegions.has(slot.region)) })),
  };
  const user = buildUserPrompt(aiTemplate, profile, catalog, equipmentIds);
  const attempts: AttemptLog[] = [];

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const reply = await callModel({ model, system: SYSTEM_PROMPT, user, schema });
    if (reply.kind === "connection") {
      attempts.push({ outcome: "connection", inputTokens: 0, outputTokens: 0 });
      return { status: "connection", attempts };
    }
    if (reply.kind !== "parsed") {
      attempts.push({ outcome: reply.kind, inputTokens: reply.inputTokens, outputTokens: reply.outputTokens });
      return { status: reply.kind, attempts };
    }
    const shapeOk =
      reply.output.sesiones.length === aiTemplate.sessions.length &&
      reply.output.sesiones.every((s, i) => s.huecos.length === aiTemplate.sessions[i].slots.length);
    if (!shapeOk) {
      attempts.push({ outcome: "validation_failed", inputTokens: reply.inputTokens, outputTokens: reply.outputTokens, reason: "forma_incorrecta" });
      continue;
    }
    const choices = template.sessions.map((session, i) => {
      const picks = reply.output.sesiones[i].huecos.map((h) => h.ejercicio);
      let next = 0;
      return session.slots.map((slot) => (offeredRegions.has(slot.region) ? picks[next++] : null));
    });
    const assembled: AssembleResult = assemblePlan({
      template,
      choices,
      catalog,
      equipmentIds,
      limitations,
      minutes: profile.minutesPerSession,
      focus: profile.focus,
    });
    if (assembled.ok) {
      attempts.push({ outcome: "ok", inputTokens: reply.inputTokens, outputTokens: reply.outputTokens });
      return { status: "ok", plan: assembled.plan, attempts };
    }
    attempts.push({ outcome: "validation_failed", inputTokens: reply.inputTokens, outputTokens: reply.outputTokens, reason: assembled.reason });
  }
  return { status: "validation_failed", attempts };
}
