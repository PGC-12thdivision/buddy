import { z } from "zod";
import { availableExercises, hasEquipment, isExcludedByLimitations } from "@/lib/domain/exclusion";
import { applyConstraints, type BuiltSession } from "@/lib/domain/plan-build";
import { buildPromptPayload } from "@/lib/domain/prompt-fields";
import { alternativesFor } from "@/lib/domain/refilter";
import type { Exercise, Focus, Joint, Plan } from "@/lib/domain/types";
import { MIN_SETS_PER_EXERCISE, validateVolume, type VolumeIssue } from "@/lib/domain/volume";
import { MAX_ATTEMPTS, type AttemptLog, type PlanModel } from "./plan";

// Coach que explica: check-in semanal (PRD §11, función 1; plan.md U8; KTD6, KTD19). Sin red: la
// llamada al modelo entra como función, para probar cada resultado sin la API.
// La IA recibe solo campos permitidos (escalas, perfil sin salud, catálogo filtrado por equipo y el
// plan actual sin huecos ni motivos) y propone cambios de series y sustituciones del catálogo
// cerrado, con un texto que explica el porqué. Después, todo lo decide el código:
// - comprueba forma, catálogo, región y rango de series (si falla, se reintenta);
// - descarta las sustituciones que cargan una zona limitada o que el usuario marcó con Molestia
//   esta semana (la IA nunca las ve: KTD19);
// - pasa la propuesta por el validador único de topes (si introduce un problema, se reintenta);
// - sustituye de forma determinista los ejercicios con Molestia de la semana y aplica la exclusión
//   por limitaciones y los topes con la misma lógica que el refiltrado (applyConstraints).
// La IA nunca toca cargas (guardarraíl 3): ni las recibe ni puede hablar de ellas.

export const CHECKIN_MODEL: PlanModel = "claude-sonnet-5-5";
export const CHECKIN_MAX_CHANGES = 6;
export const CHECKIN_MAX_SETS = 6;
export const EXPLANATION_MAX = 600;
export const REASON_MAX = 200;

// Un texto que hable de pesos se rechaza: las cargas solo las explican las reglas.
const LOAD_TEXT = /\d\s*(kg|kilo)|\bkilos?\b|\bkg\b/i;

export function checkinOutputSchema(catalogIds: readonly string[]) {
  const ids = z.enum(catalogIds as [string, ...string[]]);
  return z.object({
    cambios: z.array(
      z.object({
        sesion: z.number().int(),
        hueco: z.number().int(),
        // Nuevo número de series del hueco, o null si no cambia.
        series: z.number().int().nullable(),
        // Ejercicio sustituto del catálogo, o null si no cambia.
        ejercicio: ids.nullable(),
        motivo: z.string(),
      }),
    ),
    explicacion: z.string(),
  });
}
export type CheckinOutput = z.infer<ReturnType<typeof checkinOutputSchema>>;

// Instrucciones fijas: nada depende de las limitaciones ni de las molestias (KTD19).
export const CHECKIN_SYSTEM_PROMPT = `Eres el coach semanal de BUDDY, una app para personas que entrenan por su cuenta en el gimnasio.
Recibes un JSON con el catálogo de ejercicios de su gimnasio, su perfil (foco, días, minutos y deportes), sus escalas de la semana y su plan actual (sesiones con sus huecos: ejercicio y series).
Escalas: "sensacion" de 1 (muy mal) a 5 (muy bien); "fatiga" de 1 (nada) a 5 (mucha).
Tu tarea es proponer un ajuste pequeño del plan para la semana que empieza y explicarlo.
Reglas:
- Como mucho ${CHECKIN_MAX_CHANGES} cambios. Cada cambio indica "sesion" y "hueco" tal como vienen en el plan.
- "series": el nuevo número de series de ese hueco, entre ${MIN_SETS_PER_EXERCISE} y ${CHECKIN_MAX_SETS}; null si no cambia.
- "ejercicio": un ID del catálogo de la misma "region" que el ejercicio que sustituye y que no esté ya en esa sesión; null si no cambia.
- Ningún grupo principal (pecho, espalda, hombros, cuadriceps, isquiotibiales, gluteos) puede pasar de 20 series a la semana, y cada uno debe seguir en al menos 2 sesiones.
- Con fatiga alta (4 o 5) o sensación baja (1 o 2), baja algo de volumen. Con sensación alta y fatiga baja, puedes subir un poco. Si la semana fue bien, puedes no cambiar nada (lista vacía).
- Si hay deportes, tenlos en cuenta para no cargar de más los mismos grupos.
- Nunca hables de pesos, kilos ni cargas: los calcula la app con sus reglas. No des consejo médico.
- "motivo": una frase corta por cambio. "explicacion": dos o tres frases en español, tuteando, que expliquen el ajuste.
Responde solo con el JSON pedido.`;

export type CheckinScales = { sensacion: number; fatiga: number };
export type CheckinProfile = { focus: Focus; daysPerWeek: number; minutesPerSession: number; sports: string[] };

// Prompt del usuario: payload de campos permitidos + plan actual. Del plan solo van los huecos con
// ejercicio (posición, ID y series): ni nombres de sesión, ni huecos vacíos, ni sus motivos.
export function buildCheckinPrompt(
  base: readonly BuiltSession[],
  profile: CheckinProfile,
  scales: CheckinScales,
  catalog: readonly Exercise[],
  equipmentIds: readonly string[],
): string {
  const payload = buildPromptPayload({
    profile: {
      foco: profile.focus,
      dias: profile.daysPerWeek,
      minutos: profile.minutesPerSession,
      deportes: profile.sports,
      escalas: { sensacion: scales.sensacion, fatiga: scales.fatiga },
    },
    catalog,
    equipmentIds,
  });
  const plan = base.map((s, i) => ({
    sesion: i + 1,
    huecos: s.slots.filter((slot) => slot.exerciseId !== null).map((slot) => ({ hueco: slot.position + 1, ejercicio: slot.exerciseId, series: slot.sets })),
  }));
  return `Datos:\n${payload}\n\nPlan actual:\n${JSON.stringify(plan)}`;
}

// --- Aplicar la salida de la IA con las reglas -------------------------------------------------

export type CheckinChange = {
  sesion: number;
  posicion: number;
  antes: string | null;
  despues: string | null;
  seriesAntes: number;
  seriesDespues: number;
  // "coach": lo propuso la IA y las reglas lo dejaron igual; "reglas": lo cambió el código.
  origen: "coach" | "reglas";
  motivo: string | null;
};

export type CheckinRules = {
  molestias: readonly string[];
  catalog: readonly Exercise[];
  equipmentIds: readonly string[];
  limitations: readonly Joint[];
};

export type ApplyFailure =
  | "texto"
  | "habla_de_cargas"
  | "demasiados_cambios"
  | "hueco_inexistente"
  | "cambio_repetido"
  | "series_fuera_de_rango"
  | "id_fuera_de_catalogo"
  | "region_incorrecta"
  | "repetido"
  | "topes";

export type ApplyResult =
  | { ok: true; plan: BuiltSession[]; cambios: CheckinChange[]; descartados: number }
  | { ok: false; reason: ApplyFailure };

const clone = (sessions: readonly BuiltSession[]): BuiltSession[] => sessions.map((s) => ({ ...s, slots: s.slots.map((slot) => ({ ...slot })) }));

const toPlan = (sessions: readonly BuiltSession[]): Plan => ({
  sessions: sessions.map((s) => ({ slots: s.slots.map((slot) => ({ exerciseId: slot.exerciseId, sets: slot.sets, holeReason: slot.holeReason })) })),
});

const issueKey = (i: VolumeIssue) => (i.code === "minimo_series_ejercicio" ? `${i.code}:${i.exerciseId}` : `${i.code}:${i.group}`);

export function applyCheckinOutput(base: readonly BuiltSession[], output: CheckinOutput, rules: CheckinRules): ApplyResult {
  const { catalog, equipmentIds, limitations } = rules;
  const discomfort = new Set(rules.molestias);
  const fail = (reason: ApplyFailure): ApplyResult => ({ ok: false, reason });

  const texts = [output.explicacion, ...output.cambios.map((c) => c.motivo)];
  if (!output.explicacion.trim() || output.explicacion.length > EXPLANATION_MAX || output.cambios.some((c) => c.motivo.length > REASON_MAX)) {
    return fail("texto");
  }
  if (texts.some((t) => LOAD_TEXT.test(t))) return fail("habla_de_cargas");
  if (output.cambios.length > CHECKIN_MAX_CHANGES) return fail("demasiados_cambios");

  // Catálogo que vio la IA: solo filtrado por equipo (KTD19).
  const offered = new Map(catalog.filter((e) => hasEquipment(e, equipmentIds)).map((e) => [e.id, e]));
  const proposed = clone(base);
  const coach = new Map<string, string>();
  const substituted: { session: number; position: number }[] = [];
  let descartados = 0;

  for (const change of output.cambios) {
    const session = proposed[change.sesion - 1];
    const slot = session?.slots.find((s) => s.position === change.hueco - 1);
    if (!session || !slot || slot.exerciseId === null) return fail("hueco_inexistente");
    const key = `${change.sesion - 1}:${slot.position}`;
    if (coach.has(key)) return fail("cambio_repetido");
    coach.set(key, change.motivo.trim());
    if (change.series !== null) {
      if (!Number.isInteger(change.series) || change.series < MIN_SETS_PER_EXERCISE || change.series > CHECKIN_MAX_SETS) {
        return fail("series_fuera_de_rango");
      }
      slot.sets = change.series;
    }
    if (change.ejercicio !== null && change.ejercicio !== slot.exerciseId) {
      const exercise = offered.get(change.ejercicio);
      if (!exercise) return fail("id_fuera_de_catalogo");
      if (exercise.region !== slot.region) return fail("region_incorrecta");
      // La IA no conoce limitaciones ni molestias: una sustitución que las incumple no se aplica
      // (guardarraíl 6) y no se reintenta, porque reintentar no le daría esa información.
      if (isExcludedByLimitations(exercise, limitations) || discomfort.has(exercise.id)) {
        descartados += 1;
        continue;
      }
      slot.exerciseId = exercise.id;
      slot.pattern = exercise.pattern;
      substituted.push({ session: change.sesion - 1, position: slot.position });
    }
  }
  for (const { session, position } of substituted) {
    const slots = proposed[session].slots;
    const id = slots.find((s) => s.position === position)?.exerciseId;
    if (slots.filter((s) => s.exerciseId === id).length > 1) return fail("repetido");
  }

  // Validador único de topes (guardarraíl 4): la propuesta no puede introducir ningún problema que
  // el plan actual no tuviera (p. ej. un grupo con 21 series).
  const available = availableExercises(catalog, equipmentIds, limitations);
  const before = new Set(validateVolume(toPlan(base), catalog, available).issues.map(issueKey));
  if (validateVolume(toPlan(proposed), catalog, available).issues.some((i) => !before.has(issueKey(i)))) return fail("topes");

  const enforced = enforceRules(proposed, rules);
  if (!enforced) return fail("topes");

  const cambios: CheckinChange[] = [];
  enforced.forEach((session, i) =>
    session.slots.forEach((slot, j) => {
      const was = base[i].slots[j];
      if (was.exerciseId === slot.exerciseId && was.sets === slot.sets) return;
      const key = `${i}:${slot.position}`;
      const wanted = proposed[i].slots[j];
      const fromCoach = coach.has(key) && wanted.exerciseId === slot.exerciseId && wanted.sets === slot.sets;
      cambios.push({
        sesion: i,
        posicion: slot.position,
        antes: was.exerciseId,
        despues: slot.exerciseId,
        seriesAntes: was.sets,
        seriesDespues: slot.sets,
        origen: fromCoach ? "coach" : "reglas",
        motivo: fromCoach ? coach.get(key) || null : null,
      });
    }),
  );
  return { ok: true, plan: enforced, cambios, descartados };
}

// Reglas deterministas, las mismas al mostrar el ajuste y al aplicarlo: sustituye los ejercicios
// con Molestia de la semana (alternativa del mismo patrón y grupo, o de la misma región) y aplica
// limitaciones, equipo y topes con applyConstraints. Devuelve null si quedara algún problema de
// techo o de mínimo de series; el suelo puede quedar sin cumplir por falta de ejercicios (KTD20).
export function enforceRules(sessions: readonly BuiltSession[], rules: CheckinRules): BuiltSession[] | null {
  const { catalog, equipmentIds, limitations } = rules;
  const discomfort = new Set(rules.molestias);
  const result = clone(sessions);
  const byId = new Map(catalog.map((e) => [e.id, e]));
  const ctx = { catalog, equipmentIds, limitations };
  const allowed = (e: Exercise) => hasEquipment(e, equipmentIds) && !isExcludedByLimitations(e, limitations) && !discomfort.has(e.id);

  for (const session of result) {
    const used = new Set(session.slots.map((s) => s.exerciseId).filter((id): id is string => id !== null));
    for (const slot of session.slots) {
      if (slot.exerciseId === null || !discomfort.has(slot.exerciseId)) continue;
      const exercise = byId.get(slot.exerciseId);
      const [alternative] = exercise ? alternativesFor(exercise, ctx, [...used, ...discomfort]) : [];
      const pick = alternative ?? catalog.find((e) => e.region === slot.region && !used.has(e.id) && allowed(e));
      if (pick) {
        used.add(pick.id);
        Object.assign(slot, { exerciseId: pick.id, pattern: pick.pattern, holeReason: undefined });
      } else {
        Object.assign(slot, { exerciseId: null, holeReason: "sin_alternativa_limitacion" });
      }
    }
  }

  // Sin los ejercicios con Molestia en el catálogo, el relleno y la reparación del suelo no pueden
  // volver a ponerlos.
  const safeCatalog = catalog.filter((e) => !discomfort.has(e.id));
  applyConstraints(result, safeCatalog, equipmentIds, limitations);
  const issues = validateVolume(toPlan(result), safeCatalog, availableExercises(safeCatalog, equipmentIds, limitations)).issues;
  if (issues.some((i) => i.code !== "suelo_frecuencia_grupo")) return null;
  // Comprobación final de seguridad: ningún ejercicio fuera del equipo, limitado o con Molestia.
  const unsafe = result.some((s) =>
    s.slots.some((slot) => {
      if (slot.exerciseId === null) return false;
      const e = byId.get(slot.exerciseId);
      return !e || !allowed(e) || slot.sets < MIN_SETS_PER_EXERCISE;
    }),
  );
  return unsafe ? null : result;
}

// --- Título del resultado (diseño D17) ---------------------------------------------------------
// Lo monta el código a partir del cambio ya validado: el grupo con más cambio de series. Nunca es
// texto de la IA.

const GROUP_TEXT: Record<string, string> = {
  pecho: "pecho",
  espalda: "espalda",
  hombros: "hombro",
  cuadriceps: "pierna",
  isquiotibiales: "pierna",
  gluteos: "pierna",
};

function setsByGroup(sessions: readonly BuiltSession[], byId: Map<string, Exercise>) {
  const totals = new Map<string, number>();
  for (const slot of sessions.flatMap((s) => s.slots)) {
    const e = slot.exerciseId ? byId.get(slot.exerciseId) : undefined;
    if (!e) continue;
    for (const name of new Set(e.muscleGroups.map((g) => GROUP_TEXT[g]).filter(Boolean))) totals.set(name, (totals.get(name) ?? 0) + slot.sets);
  }
  return totals;
}

export function checkinTitle(base: readonly BuiltSession[], final: readonly BuiltSession[], changes: number, catalog: readonly Exercise[]): string {
  const byId = new Map(catalog.map((e) => [e.id, e]));
  const before = setsByGroup(base, byId);
  const after = setsByGroup(final, byId);
  let best: { name: string; delta: number } | null = null;
  for (const name of ["pierna", "pecho", "espalda", "hombro"]) {
    const delta = (after.get(name) ?? 0) - (before.get(name) ?? 0);
    if (delta !== 0 && (!best || Math.abs(delta) > Math.abs(best.delta))) best = { name, delta };
  }
  if (best) return `${best.delta < 0 ? "Menos" : "Más"} ${best.name} esta semana`;
  if (changes > 0) return `${changes} ${changes === 1 ? "cambio" : "cambios"} en tu semana`;
  return "Tu plan sigue igual";
}

// --- Bucle de generación con reintentos (mismo flujo que el plan, KTD6) ------------------------

export type CheckinReply =
  | { kind: "parsed"; output: CheckinOutput; inputTokens: number; outputTokens: number }
  | { kind: "refused" | "empty"; inputTokens: number; outputTokens: number }
  | { kind: "connection" };

export type CheckinCallModel = (request: {
  model: PlanModel;
  system: string;
  user: string;
  schema: ReturnType<typeof checkinOutputSchema>;
}) => Promise<CheckinReply>;

export type RunCheckinInput = CheckinRules & {
  model: PlanModel;
  callModel: CheckinCallModel;
  base: readonly BuiltSession[];
  profile: CheckinProfile;
  scales: CheckinScales;
  deadlineMs?: number;
  now?: () => number;
};

export type CheckinProposal = {
  titulo: string;
  explicacion: string;
  cambios: CheckinChange[];
  descartados: number;
  plan: BuiltSession[];
};

export type RunCheckinResult =
  | { status: "ok"; proposal: CheckinProposal; attempts: AttemptLog[] }
  | { status: "validation_failed" | "refused" | "empty" | "connection"; attempts: AttemptLog[] };

export async function runCheckin(input: RunCheckinInput): Promise<RunCheckinResult> {
  const { model, callModel, base, profile, scales, catalog, equipmentIds, deadlineMs = 75_000, now = Date.now } = input;
  const startedAt = now();
  const schema = checkinOutputSchema(catalog.map((e) => e.id));
  const user = buildCheckinPrompt(base, profile, scales, catalog, equipmentIds);
  const attempts: AttemptLog[] = [];

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    if (attempt > 0 && now() - startedAt > deadlineMs) break;
    const reply = await callModel({ model, system: CHECKIN_SYSTEM_PROMPT, user, schema });
    if (reply.kind === "connection") {
      attempts.push({ outcome: "connection", inputTokens: 0, outputTokens: 0 });
      return { status: "connection", attempts };
    }
    if (reply.kind !== "parsed") {
      attempts.push({ outcome: reply.kind, inputTokens: reply.inputTokens, outputTokens: reply.outputTokens });
      return { status: reply.kind, attempts };
    }
    const applied = applyCheckinOutput(base, reply.output, input);
    if (!applied.ok) {
      attempts.push({ outcome: "validation_failed", inputTokens: reply.inputTokens, outputTokens: reply.outputTokens, reason: applied.reason });
      continue;
    }
    attempts.push({ outcome: "ok", inputTokens: reply.inputTokens, outputTokens: reply.outputTokens });
    return {
      status: "ok",
      attempts,
      proposal: {
        titulo: checkinTitle(base, applied.plan, applied.cambios.length, catalog),
        explicacion: reply.output.explicacion.trim(),
        cambios: applied.cambios,
        descartados: applied.descartados,
        plan: applied.plan,
      },
    };
  }
  return { status: "validation_failed", attempts };
}

// --- Ajuste guardado y su revalidación al aplicar ----------------------------------------------
// La fila de checkins la escribe solo el servidor (RLS sin INSERT ni UPDATE para el usuario), pero
// "Aplicar" no se fía de ella: vuelve a leerla con zod y a pasar el plan por las reglas y los topes
// con las limitaciones, el equipo y las molestias de ese momento.

const slotSchema = z.object({
  position: z.number().int().min(0).max(20),
  region: z.string().min(1).max(60),
  pattern: z.string().min(1).max(60),
  exerciseId: z.string().min(1).max(80).nullable(),
  holeReason: z.enum(["sin_alternativa_limitacion", "sin_alternativa_equipo"]).optional(),
  sets: z.number().int().min(MIN_SETS_PER_EXERCISE).max(CHECKIN_MAX_SETS),
  repMin: z.number().int().min(1).max(30),
  repMax: z.number().int().min(1).max(30),
});

export const storedAdjustmentSchema = z.object({
  v: z.literal(1),
  basePlanId: z.string().uuid(),
  titulo: z.string().max(80),
  explicacion: z.string().max(EXPLANATION_MAX),
  descartados: z.number().int().min(0),
  cambios: z.array(
    z.object({
      sesion: z.number().int().min(0),
      posicion: z.number().int().min(0),
      antes: z.string().nullable(),
      despues: z.string().nullable(),
      seriesAntes: z.number().int(),
      seriesDespues: z.number().int(),
      origen: z.enum(["coach", "reglas"]),
      motivo: z.string().max(REASON_MAX).nullable(),
    }),
  ),
  plan: z
    .array(
      z.object({
        dayIndex: z.number().int().min(0).max(6),
        kind: z.enum(["cuerpo_completo", "torso", "pierna"]),
        label: z.enum(["Cuerpo completo", "Torso", "Pierna"]),
        slots: z.array(slotSchema).min(1).max(12),
      }),
    )
    .min(1)
    .max(5),
});
export type StoredAdjustment = z.infer<typeof storedAdjustmentSchema>;

export const toStoredAdjustment = (basePlanId: string, proposal: CheckinProposal): StoredAdjustment => ({
  v: 1,
  basePlanId,
  titulo: proposal.titulo,
  explicacion: proposal.explicacion,
  descartados: proposal.descartados,
  cambios: proposal.cambios,
  plan: proposal.plan.map((s) => ({
    dayIndex: s.dayIndex,
    kind: s.kind,
    label: s.label as StoredAdjustment["plan"][number]["label"],
    slots: s.slots.map((slot) => ({ ...slot, holeReason: slot.exerciseId ? undefined : slot.holeReason })),
  })),
});

export type RevalidateResult = { ok: true; plan: BuiltSession[] } | { ok: false; reason: "no_valido" | "desfasado" };

export function revalidateStoredAdjustment(raw: unknown, activePlanId: string, rules: CheckinRules): RevalidateResult {
  const parsed = storedAdjustmentSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, reason: "no_valido" };
  const stored = parsed.data;
  // El ajuste se calculó sobre una versión del plan: si el plan ha cambiado desde entonces
  // (refiltrado, cambio de foco), no se aplica encima.
  if (stored.basePlanId !== activePlanId) return { ok: false, reason: "desfasado" };
  const known = new Set(rules.catalog.map((e) => e.id));
  const sessions: BuiltSession[] = stored.plan.map((s) => ({
    ...s,
    slots: s.slots.map((slot) => ({ ...slot, holeReason: slot.exerciseId ? undefined : (slot.holeReason ?? "sin_alternativa_equipo") })),
  }));
  if (sessions.some((s) => s.slots.some((slot) => slot.exerciseId !== null && (!known.has(slot.exerciseId) || slot.repMin > slot.repMax)))) {
    return { ok: false, reason: "no_valido" };
  }
  const enforced = enforceRules(sessions, rules);
  return enforced ? { ok: true, plan: enforced } : { ok: false, reason: "no_valido" };
}
