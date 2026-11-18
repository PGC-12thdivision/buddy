"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { evaluateScreening, SCREENING_QUESTIONS } from "@/lib/domain/screening";
import { JOINTS } from "@/lib/domain/types";
import { logError } from "@/lib/log";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { accountProgress, hasActiveConsent, sessionUserId } from "@/lib/wizard/account";
import { answersSchema, type WizardAnswers } from "@/lib/wizard/answers";
import { wizardEventSchema } from "@/lib/wizard/events";
import { nextScreenForAccount } from "@/lib/wizard/progress";
import { CONSENT_VERSION, SCREENING_VERSION } from "@/lib/wizard/versions";

// Server Actions del wizard (plan.md U4, KTD4, KTD14, KTD15, KTD17).
// - Cada acción, salvo el registro, toma el user_id solo de los claims de la sesión.
// - Ninguna devuelve ni registra el mensaje de Supabase: solo códigos (log seguro).
// - Datos de salud (limitaciones y cribado) solo con consentimiento vigente; del cribado se
//   guarda el resultado, nunca las respuestas.

type Fail<E extends string = string> = { ok: false; error: E };
const NO_SESSION = { ok: false, error: "sin_sesion" } as const;
const INVALID = { ok: false, error: "no_valido" } as const;

// ---------------------------------------------------------------------------
// Registro (sin sesión)
// ---------------------------------------------------------------------------

const registroSchema = z.object({
  email: z.email(),
  password: z.string().min(8).max(72),
  adult: z.literal(true),
  answers: answersSchema,
  events: z.array(wizardEventSchema.extend({ at: z.iso.datetime() })).max(40),
});

type RegistroField = "email" | "password" | "adult" | "form";
export type RegistroResult = { ok: true } | { ok: false; errors: Partial<Record<RegistroField, string>> };

const REGISTRO_MESSAGES: Record<Exclude<RegistroField, "form">, string> = {
  email: "Escribe un email válido.",
  password: "La contraseña necesita al menos 8 caracteres.",
  adult: "Para usar BUDDY tienes que tener 18 años o más.",
};
const GENERIC_ERROR = "No hemos podido crear la cuenta. Inténtalo de nuevo en un momento.";

async function catalogIds(table: "equipment_types" | "activity_types"): Promise<Set<string>> {
  const { data, error } = await createAdminClient().from(table).select("id");
  if (error) logError("leer_catalogo", error);
  return new Set((data ?? []).map((row) => row.id));
}

async function answersMatchCatalog(answers: Pick<WizardAnswers, "equipmentTypeIds" | "sports">): Promise<boolean> {
  const [equipment, activities] = await Promise.all([catalogIds("equipment_types"), catalogIds("activity_types")]);
  return answers.equipmentTypeIds.every((id) => equipment.has(id)) && answers.sports.every((id) => activities.has(id));
}

// Adónde vuelve el enlace del email de confirmación. Con la plantilla por defecto de Supabase
// (sin SMTP propio no se puede editar), el enlace pasa por Supabase, que confirma el email, y
// vuelve aquí con un `code`. Supabase solo acepta las URLs de su lista de Redirect URLs.
async function confirmRedirect(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  const origin = h.get("origin") ?? (host ? `${proto}://${host}` : "");
  return `${origin}/auth/confirm?next=/consentimiento`;
}

// Una hora del cliente fuera de lo razonable se cambia por la del servidor.
function eventTime(at: string, now: Date): string {
  const time = new Date(at).getTime();
  const tooOld = now.getTime() - 30 * 24 * 3600 * 1000;
  return time > now.getTime() || time < tooOld ? now.toISOString() : new Date(time).toISOString();
}

export async function registrarse(input: unknown): Promise<RegistroResult> {
  const parsed = registroSchema.safeParse(input);
  if (!parsed.success) {
    const errors: Partial<Record<RegistroField, string>> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0];
      if (field === "email" || field === "password" || field === "adult") errors[field] = REGISTRO_MESSAGES[field];
      else errors.form = GENERIC_ERROR;
    }
    return { ok: false, errors };
  }
  const { email, password, answers, events } = parsed.data;
  if (!(await answersMatchCatalog(answers))) return { ok: false, errors: { form: GENERIC_ERROR } };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: await confirmRedirect() } });
  if (error) {
    logError("registro", error);
    if (error.code === "weak_password") return { ok: false, errors: { password: "Elige una contraseña más difícil de adivinar." } };
    if (error.code === "email_address_invalid") return { ok: false, errors: { email: REGISTRO_MESSAGES.email } };
    if (error.code === "user_already_exists") return { ok: true };
    if (error.code?.startsWith("over_")) {
      return { ok: false, errors: { form: "Demasiados intentos seguidos. Prueba de nuevo dentro de un rato." } };
    }
    return { ok: false, errors: { form: GENERIC_ERROR } };
  }

  // Email ya registrado: Supabase devuelve un usuario sin identidades. Misma respuesta y nada se
  // escribe (KTD15).
  const user = data.user;
  if (!user || !user.identities || user.identities.length === 0) return { ok: true };

  // El user_id sale solo de signUp. Inserciones puras: nunca sobrescriben una cuenta existente.
  const admin = createAdminClient();
  const now = new Date();
  const writes = await Promise.all([
    admin.from("onboarding_answers").insert({
      user_id: user.id,
      focus: answers.focus,
      experience: answers.experience,
      days_per_week: answers.daysPerWeek,
      minutes_per_session: answers.minutesPerSession,
      sports: answers.sports,
    }),
    admin.from("gym_profiles").insert({
      user_id: user.id,
      preset: answers.gymPreset,
      equipment_type_ids: answers.equipmentTypeIds,
    }),
    admin.from("events").insert([
      ...events.map((e) => ({ user_id: user.id, name: e.name, step: e.step, created_at: eventTime(e.at, now) })),
      { user_id: user.id, name: "registro" as const, step: "registro" as const, created_at: now.toISOString() },
    ]),
  ]);
  // La cuenta ya existe: un fallo aquí no se le muestra; el resumen detecta respuestas que falten.
  for (const write of writes) if (write.error) logError("registro_guardar", write.error);
  return { ok: true };
}

export async function reenviarConfirmacion(input: unknown): Promise<{ ok: true } | Fail<"limite" | "no_valido">> {
  const parsed = z.object({ email: z.email() }).safeParse(input);
  if (!parsed.success) return INVALID;
  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: parsed.data.email,
    options: { emailRedirectTo: await confirmRedirect() },
  });
  if (error) {
    logError("reenviar_confirmacion", error);
    if (error.code?.startsWith("over_")) return { ok: false, error: "limite" };
  }
  // Misma respuesta exista o no la cuenta.
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Entrar (sin sesión todavía)
// ---------------------------------------------------------------------------

export async function entrar(input: unknown): Promise<{ ok: true; next: ReturnType<typeof nextScreenForAccount> } | Fail<"credenciales" | "sin_confirmar" | "limite" | "no_valido">> {
  const parsed = z.object({ email: z.email(), password: z.string().min(1).max(72) }).safeParse(input);
  if (!parsed.success) return INVALID;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error || !data.user) {
    if (error) logError("entrar", error);
    if (error?.code === "email_not_confirmed") return { ok: false, error: "sin_confirmar" };
    if (error?.code?.startsWith("over_")) return { ok: false, error: "limite" };
    return { ok: false, error: "credenciales" };
  }
  return { ok: true, next: nextScreenForAccount(await accountProgress(supabase, data.user.id)) };
}

// ---------------------------------------------------------------------------
// Con sesión
// ---------------------------------------------------------------------------

export async function darConsentimiento(input: unknown): Promise<{ ok: true } | Fail> {
  const supabase = await createClient();
  const userId = await sessionUserId(supabase);
  if (!userId) return NO_SESSION;
  if (!z.object({ accepted: z.literal(true) }).safeParse(input).success) return INVALID;

  if (await hasActiveConsent(supabase, userId)) return { ok: true };
  // user_id lo pone la base de datos (auth.uid()) y la RLS lo comprueba.
  const { error } = await supabase.from("consents").insert({ version: CONSENT_VERSION });
  if (error) {
    logError("dar_consentimiento", error);
    return { ok: false, error: "fallo" };
  }
  return { ok: true };
}

const seguridadSchema = z.object({
  limitations: z.array(z.enum(JOINTS)).max(JOINTS.length),
  answers: z.object(Object.fromEntries(SCREENING_QUESTIONS.map((q) => [q, z.boolean()]))),
});

export type SeguridadResult = { ok: true; status: "apto" | "bloqueado" | "requiere_zona" } | Fail;

export async function guardarSeguridad(input: unknown): Promise<SeguridadResult> {
  const supabase = await createClient();
  const userId = await sessionUserId(supabase);
  if (!userId) return NO_SESSION;
  if (!(await hasActiveConsent(supabase, userId))) return { ok: false, error: "sin_consentimiento" };

  const parsed = seguridadSchema.safeParse(input);
  if (!parsed.success) return INVALID;
  const limitations = [...new Set(parsed.data.limitations)];
  const result = evaluateScreening(parsed.data.answers, limitations);
  const admin = createAdminClient();

  if (result.status === "incompleto") return INVALID;
  if (result.status === "requiere_zona") return { ok: true, status: "requiere_zona" };

  if (result.status === "bloqueado") {
    // Solo un contador diario sin user_id (D30). Si había un cribado superado antes, deja de valer:
    // un «Sí» de riesgo bloquea la generación (guardarraíl 5).
    const [counter, cleared] = await Promise.all([
      admin.rpc("bump_daily_counter", { p_metric: "cribado_bloqueado" }),
      admin.from("health_profile").delete().eq("user_id", userId),
    ]);
    if (counter.error) logError("contador_cribado", counter.error);
    if (cleared.error) logError("limpiar_salud", cleared.error);
    return { ok: true, status: "bloqueado" };
  }

  const now = new Date().toISOString();
  const { error } = await admin.from("health_profile").upsert({
    user_id: userId,
    limitations,
    screening_version: SCREENING_VERSION,
    screening_passed_at: now,
    updated_at: now,
  });
  if (error) {
    logError("guardar_seguridad", error);
    return { ok: false, error: "fallo" };
  }
  return { ok: true, status: "apto" };
}

export async function registrarEvento(input: unknown): Promise<{ ok: true } | Fail> {
  const supabase = await createClient();
  const userId = await sessionUserId(supabase);
  if (!userId) return NO_SESSION;
  const parsed = wizardEventSchema.safeParse(input);
  if (!parsed.success) return INVALID;
  const { error } = await createAdminClient().from("events").insert({ user_id: userId, ...parsed.data });
  if (error) logError("registrar_evento", error);
  return { ok: true };
}

// Cambiar una respuesta desde el resumen, antes de tener plan. Con plan, el cambio de foco o días
// es la regeneración de U6 (D43).
export async function actualizarRespuestas(input: unknown): Promise<{ ok: true } | Fail> {
  const supabase = await createClient();
  const userId = await sessionUserId(supabase);
  if (!userId) return NO_SESSION;
  const parsed = answersSchema.partial().safeParse(input);
  if (!parsed.success) return INVALID;

  const progress = await accountProgress(supabase, userId);
  if (progress.hasActivePlan) return { ok: false, error: "plan_activo" };

  const [current, gym] = await Promise.all([
    supabase.from("onboarding_answers").select("*").eq("user_id", userId).maybeSingle(),
    supabase.from("gym_profiles").select("*").eq("user_id", userId).maybeSingle(),
  ]);
  const merged = answersSchema.safeParse({
    focus: current.data?.focus,
    experience: current.data?.experience,
    daysPerWeek: current.data?.days_per_week,
    minutesPerSession: current.data?.minutes_per_session,
    sports: current.data?.sports ?? [],
    gymPreset: gym.data?.preset,
    equipmentTypeIds: gym.data?.equipment_type_ids,
    ...parsed.data,
  });
  if (!merged.success) return { ok: false, error: "incompleto" };
  const answers = merged.data;
  if (!(await answersMatchCatalog(answers))) return INVALID;

  const now = new Date().toISOString();
  const [answersWrite, gymWrite] = await Promise.all([
    createAdminClient().from("onboarding_answers").upsert({
      user_id: userId,
      focus: answers.focus,
      experience: answers.experience,
      days_per_week: answers.daysPerWeek,
      minutes_per_session: answers.minutesPerSession,
      sports: answers.sports,
      updated_at: now,
    }),
    supabase
      .from("gym_profiles")
      .upsert({ user_id: userId, preset: answers.gymPreset, equipment_type_ids: answers.equipmentTypeIds, updated_at: now }, { onConflict: "user_id" }),
  ]);
  for (const write of [answersWrite, gymWrite]) if (write.error) logError("actualizar_respuestas", write.error);
  return answersWrite.error || gymWrite.error ? { ok: false, error: "fallo" } : { ok: true };
}

// Salida sin consentimiento (diseño D14): borra la cuenta y todo lo suyo (on delete cascade).
export async function borrarCuenta(): Promise<{ ok: true } | Fail> {
  const supabase = await createClient();
  const userId = await sessionUserId(supabase);
  if (!userId) return NO_SESSION;
  const { error } = await createAdminClient().auth.admin.deleteUser(userId);
  if (error) {
    logError("borrar_cuenta", error);
    return { ok: false, error: "fallo" };
  }
  await supabase.auth.signOut();
  return { ok: true };
}

export async function salir(): Promise<{ ok: true }> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return { ok: true };
}
