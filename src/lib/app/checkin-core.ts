import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { callCheckinModel } from "@/lib/ai/client";
import {
  CHECKIN_MODEL,
  revalidateStoredAdjustment,
  runCheckin,
  storedAdjustmentSchema,
  toStoredAdjustment,
  type CheckinScales,
  type StoredAdjustment,
} from "@/lib/ai/checkin";
import { costUsd } from "@/lib/ai/plan";
import { exerciseCatalog, sanitizeEquipment, type CatalogExercise } from "@/lib/catalog";
import { PREMIUM_CHECKINS_PER_WEEK } from "@/lib/domain/ai-limits";
import { checkinWeek, checkinWindow, madridWeekStart, type CheckinWindow } from "@/lib/domain/checkin";
import { isPremium } from "@/lib/domain/premium";
import type { Focus, Joint } from "@/lib/domain/types";
import { logError } from "@/lib/log";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/types";
import { hasActiveConsent } from "@/lib/wizard/account";
import { loadActivePlan, type ActivePlan } from "./active-plan";
import { activeToBuilt, savePlanPayload } from "./refilter-core";

// Check-in semanal del coach en el servidor (plan.md U8). Quien llama ya ha sacado el userId de los
// claims (KTD15). Lecturas con la sesión del usuario (RLS); escrituras de checkins, plans y ai_calls
// con el cliente admin, siempre después de las comprobaciones (KTD2).

type Client = SupabaseClient<Database>;

export type CheckinRow = { id: string; feeling: number; fatigue: number; applied: boolean | null; adjustment: StoredAdjustment | null };

// Estado de la semana para Hoy y para /checkin: ventana (D10), premium y la fila guardada.
export type CheckinState = {
  week: string;
  window: CheckinWindow;
  premium: boolean;
  row: CheckinRow | null;
};

async function readRow(supabase: Client, userId: string, week: string): Promise<CheckinRow | null> {
  const { data } = await supabase
    .from("checkins")
    .select("id, feeling, fatigue, applied, adjustment")
    .eq("user_id", userId)
    .eq("week_start", week)
    .maybeSingle();
  if (!data) return null;
  const parsed = storedAdjustmentSchema.safeParse(data.adjustment);
  return { id: data.id, feeling: data.feeling, fatigue: data.fatigue, applied: data.applied, adjustment: parsed.success ? parsed.data : null };
}

async function sessionsThisWeek(supabase: Client, userId: string, now: Date): Promise<number> {
  const { count } = await supabase
    .from("workout_sessions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("ended_at", madridWeekStart(now).toISOString());
  return count ?? 0;
}

export async function loadCheckinState(supabase: Client, userId: string, daysPerWeek: number, premium: boolean, now = new Date()): Promise<CheckinState> {
  const week = checkinWeek(now);
  const [row, done] = await Promise.all([readRow(supabase, userId, week), sessionsThisWeek(supabase, userId, now)]);
  return { week, window: checkinWindow(now, daysPerWeek, done), premium, row };
}

// Ejercicios marcados con Molestia esta semana. Dato de salud: solo se usa aquí, de forma
// determinista, y nunca va al prompt (KTD19). Sin consentimiento vigente, no se consulta.
async function discomfortThisWeek(supabase: Client, userId: string, now: Date): Promise<string[]> {
  const { data } = await supabase
    .from("discomfort_marks")
    .select("exercise_id")
    .eq("user_id", userId)
    .gte("created_at", madridWeekStart(now).toISOString());
  return [...new Set((data ?? []).map((m) => m.exercise_id))];
}

type Inputs = {
  plan: ActivePlan;
  premium: boolean;
  focus: Focus;
  minutes: number;
  sports: string[];
  catalog: CatalogExercise[];
  equipmentIds: string[];
  limitations: Joint[];
  molestias: string[];
};

type InputsResult = { ok: true; inputs: Inputs } | { ok: false; error: "sin_permiso" | "incompleto" | "fallo" };

async function loadInputs(supabase: Client, userId: string, now: Date): Promise<InputsResult> {
  const [consent, health, answers, gym, account, plan, catalog] = await Promise.all([
    hasActiveConsent(supabase, userId),
    supabase.from("health_profile").select("limitations").eq("user_id", userId).maybeSingle(),
    supabase.from("onboarding_answers").select("focus, minutes_per_session, sports").eq("user_id", userId).maybeSingle(),
    supabase.from("gym_profiles").select("equipment_type_ids").eq("user_id", userId).maybeSingle(),
    supabase.from("account_status").select("trial_ends_at, subscription_status").eq("user_id", userId).maybeSingle(),
    loadActivePlan(supabase, userId),
    exerciseCatalog(),
  ]);
  // Sin consentimiento vigente o sin cribado superado no se llama a la IA (guardarraíles 5 y 8).
  if (!consent || !health.data) return { ok: false, error: "sin_permiso" };
  if (health.error || gym.error || answers.error || account.error || catalog.length === 0) {
    logError("checkin_lectura", health.error ?? gym.error ?? answers.error ?? account.error ?? { code: "sin_catalogo" });
    return { ok: false, error: "fallo" };
  }
  if (!plan || !answers.data || !gym.data) return { ok: false, error: "incompleto" };
  const equipmentIds = sanitizeEquipment(gym.data.equipment_type_ids, [...new Set(catalog.map((e) => e.equipmentTypeId))]);
  if (equipmentIds.length === 0) return { ok: false, error: "incompleto" };
  const trialEnd = account.data ? new Date(account.data.trial_ends_at) : null;
  return {
    ok: true,
    inputs: {
      plan,
      premium: isPremium(now, trialEnd, account.data?.subscription_status ?? null),
      focus: answers.data.focus as Focus,
      minutes: answers.data.minutes_per_session,
      sports: answers.data.sports,
      catalog,
      equipmentIds,
      limitations: health.data.limitations as Joint[],
      molestias: await discomfortThisWeek(supabase, userId, now),
    },
  };
}

// --- Pedir el check-in ---------------------------------------------------------------------------

export type CheckinStatus =
  | "ok"
  | "sin_permiso"
  | "incompleto"
  | "solo_premium"
  | "no_toca"
  | "vacio"
  | "limite"
  | "tope_diario"
  | "conexion"
  | "validacion";

export async function requestCheckin(
  supabase: Client,
  userId: string,
  scales: CheckinScales,
  maxDurationS: number,
  now = new Date(),
): Promise<CheckinStatus> {
  const loaded = await loadInputs(supabase, userId, now);
  if (!loaded.ok) return loaded.error === "fallo" ? "conexion" : loaded.error;
  const { inputs } = loaded;
  // Premium en el servidor (KTD15): sin premium no se llama a la IA.
  if (!inputs.premium) return "solo_premium";

  const week = checkinWeek(now);
  // Uno por semana: si ya existe, se devuelve el guardado sin llamar a la IA (diseño D10).
  if (await readRow(supabase, userId, week)) return "ok";
  const window = checkinWindow(now, inputs.plan.daysPerWeek, await sessionsThisWeek(supabase, userId, now));
  if (window !== "disponible") return window;

  const admin = createAdminClient();
  const reservation = await admin.rpc("reserve_ai_call", {
    p_user: userId,
    p_kind: "checkin",
    p_model: CHECKIN_MODEL,
    p_period_limit: PREMIUM_CHECKINS_PER_WEEK,
    p_max_duration_s: maxDurationS,
  });
  if (reservation.error) {
    logError("reservar_ia", reservation.error);
    return "conexion";
  }
  const reserved = reservation.data as { ok: boolean; id?: string; reason?: string };
  if (!reserved.ok || !reserved.id) {
    // Una petición paralela pudo guardar el check-in mientras tanto: entonces se muestra ese.
    if (await readRow(supabase, userId, week)) return "ok";
    return reserved.reason === "tope_diario" ? "tope_diario" : "limite";
  }

  const base = activeToBuilt(inputs.plan, inputs.minutes);
  const result = await runCheckin({
    model: CHECKIN_MODEL,
    callModel: callCheckinModel,
    base,
    profile: { focus: inputs.focus, daysPerWeek: inputs.plan.daysPerWeek, minutesPerSession: inputs.minutes, sports: inputs.sports },
    scales,
    catalog: inputs.catalog,
    equipmentIds: inputs.equipmentIds,
    limitations: inputs.limitations,
    molestias: inputs.molestias,
  });

  const inputTokens = result.attempts.reduce((sum, a) => sum + a.inputTokens, 0);
  const outputTokens = result.attempts.reduce((sum, a) => sum + a.outputTokens, 0);
  const cost = costUsd(CHECKIN_MODEL, inputTokens, outputTokens);
  const closeCall = async (outcome: string) => {
    const { error } = await admin
      .from("ai_calls")
      .update({ outcome, input_tokens: inputTokens, output_tokens: outputTokens, cost_usd: cost, completed_at: new Date().toISOString() })
      .eq("id", reserved.id!)
      .eq("user_id", userId);
    if (error) logError("cerrar_ia", error);
  };

  if (result.status !== "ok") {
    // Un intento fallido no consume el límite semanal (KTD18).
    await closeCall(result.status);
    return result.status === "connection" ? "conexion" : "validacion";
  }

  const saved = await admin.from("checkins").insert({
    user_id: userId,
    week_start: week,
    feeling: scales.sensacion,
    fatigue: scales.fatiga,
    adjustment: toStoredAdjustment(inputs.plan.id, result.proposal),
    applied: null,
  });
  if (saved.error) {
    logError("guardar_checkin", saved.error);
    // No queda guardado: el intento no cuenta.
    await closeCall("validation_failed");
    return saved.error.code === "23505" ? "ok" : "conexion";
  }
  await closeCall("ok");
  const event = await admin.from("events").insert({ user_id: userId, name: "checkin_hecho" });
  if (event.error) logError("evento_checkin", event.error);
  return "ok";
}

// --- Aplicar o mantener --------------------------------------------------------------------------

export type DecisionResult =
  | { ok: true }
  | { ok: false; error: "sin_checkin" | "ya_decidido" | "solo_premium" | "desfasado" | "no_valido" | "sin_permiso" | "incompleto" | "fallo" };

// "Aplicar a mi semana": crea una versión nueva del plan (source "checkin") tras volver a pasar el
// ajuste guardado por zod, las reglas (molestias, limitaciones, equipo) y el validador de topes.
export async function applyCheckin(supabase: Client, userId: string, now = new Date()): Promise<DecisionResult> {
  const loaded = await loadInputs(supabase, userId, now);
  if (!loaded.ok) return { ok: false, error: loaded.error };
  const { inputs } = loaded;
  if (!inputs.premium) return { ok: false, error: "solo_premium" };

  const { data: row } = await supabase
    .from("checkins")
    .select("id, applied, adjustment")
    .eq("user_id", userId)
    .eq("week_start", checkinWeek(now))
    .maybeSingle();
  if (!row) return { ok: false, error: "sin_checkin" };
  if (row.applied !== null) return { ok: false, error: "ya_decidido" };

  const checked = revalidateStoredAdjustment(row.adjustment, inputs.plan.id, {
    catalog: inputs.catalog,
    equipmentIds: inputs.equipmentIds,
    limitations: inputs.limitations,
    molestias: inputs.molestias,
  });
  if (!checked.ok) return { ok: false, error: checked.reason };

  const admin = createAdminClient();
  // Se reserva la decisión antes de guardar: dos toques a la vez no crean dos versiones.
  const claim = await admin.from("checkins").update({ applied: true }).eq("id", row.id).eq("user_id", userId).is("applied", null).select("id");
  if (claim.error || !claim.data?.length) {
    if (claim.error) logError("decidir_checkin", claim.error);
    return { ok: false, error: claim.error ? "fallo" : "ya_decidido" };
  }
  const saved = await admin.rpc("save_plan", {
    p_user: userId,
    p_plan: savePlanPayload(inputs.plan, checked.plan, "checkin"),
    // Sin llamada de IA nueva: la del check-in ya quedó registrada.
    p_ai_call: null as unknown as string,
    p_input_tokens: 0,
    p_output_tokens: 0,
    p_cost_usd: 0,
  });
  if (saved.error) {
    logError("aplicar_checkin", saved.error);
    const undo = await admin.from("checkins").update({ applied: null }).eq("id", row.id).eq("user_id", userId);
    if (undo.error) logError("deshacer_checkin", undo.error);
    return { ok: false, error: "fallo" };
  }
  return { ok: true };
}

// "Mantener mi plan": no cambia nada del plan; solo deja la decisión registrada.
export async function keepPlan(supabase: Client, userId: string, now = new Date()): Promise<DecisionResult> {
  const { data: row } = await supabase.from("checkins").select("id, applied").eq("user_id", userId).eq("week_start", checkinWeek(now)).maybeSingle();
  if (!row) return { ok: false, error: "sin_checkin" };
  if (row.applied !== null) return { ok: false, error: "ya_decidido" };
  const { error } = await createAdminClient().from("checkins").update({ applied: false }).eq("id", row.id).eq("user_id", userId).is("applied", null);
  if (error) {
    logError("decidir_checkin", error);
    return { ok: false, error: "fallo" };
  }
  return { ok: true };
}

// Ejercicios con Molestia de la semana, para componer al mostrarlo el porqué de un cambio de las
// reglas (no se guarda en el ajuste: al retirar el consentimiento, las marcas se borran).
export async function discomfortForDisplay(supabase: Client, userId: string, now = new Date()): Promise<Set<string>> {
  if (!(await hasActiveConsent(supabase, userId))) return new Set();
  return new Set(await discomfortThisWeek(supabase, userId, now));
}
