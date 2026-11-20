"use server";

import { cookies } from "next/headers";
import { z } from "zod";
import { generateAndSavePlan, type GenerationStatus } from "@/lib/app/plan-generation";
import { refilterForUser } from "@/lib/app/refilter-core";
import type { PlanChange } from "@/lib/domain/exclusion-summary";
import { equipmentCatalog, exerciseCatalog, sanitizeEquipment } from "@/lib/catalog";
import { FREE_PLAN_CHANGES_PER_MONTH, nextMonthStartText, PREMIUM_REGENERATIONS_PER_MONTH } from "@/lib/domain/ai-limits";
import { isPremium } from "@/lib/domain/premium";
import { JOINTS, type Joint } from "@/lib/domain/types";
import { logError } from "@/lib/log";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { THEME_COOKIE, THEME_COOKIE_MAX_AGE, THEMES } from "@/lib/theme";
import { accountProgress, hasActiveConsent, sessionUserId } from "@/lib/wizard/account";
import { answersSchema, DAYS_OPTIONS, FOCUS_OPTIONS } from "@/lib/wizard/answers";
import { nextScreenForAccount } from "@/lib/wizard/progress";

// Ajustes (plan.md U11; diseño D15, D26/D43; KTD15–KTD17). Cada acción saca el user_id de los
// claims, valida la entrada con zod y registra solo códigos fijos. Las limitaciones nunca salen en
// logs, eventos ni URLs (guardarraíl 8); el refiltrado tras cambiar equipo o limitaciones es
// determinista y gratis (D35).

type Fail<E extends string> = { ok: false; error: E | "sin_sesion" | "no_valido" };
const NO_SESSION = { ok: false, error: "sin_sesion" } as const;
const INVALID = { ok: false, error: "no_valido" } as const;

// Tope de la función que regenera (igual que /api/plan y que el maxDuration de /ajustes/foco-dias).
const PLAN_MAX_DURATION_S = 120;

async function claims() {
  const supabase = await createClient();
  const userId = await sessionUserId(supabase);
  return { supabase, userId };
}

export type RefilteredResult = { ok: true; changed: number; holes: number; changes: PlanChange[] };

// --- Mi gimnasio -----------------------------------------------------------------------------

const gimnasioSchema = answersSchema.pick({ gymPreset: true, equipmentTypeIds: true });

export async function guardarGimnasio(input: unknown): Promise<RefilteredResult | Fail<"fallo">> {
  const parsed = gimnasioSchema.safeParse(input);
  if (!parsed.success) return INVALID;
  const { supabase, userId } = await claims();
  if (!userId) return NO_SESSION;

  // Solo IDs del catálogo (D56): una lista vacía tras limpiar no es un gimnasio.
  const catalog = await equipmentCatalog();
  if (catalog.length === 0) return { ok: false, error: "fallo" };
  const equipmentIds = sanitizeEquipment(parsed.data.equipmentTypeIds, catalog.map((e) => e.id));
  if (equipmentIds.length === 0) return INVALID;

  const { error } = await supabase
    .from("gym_profiles")
    .upsert(
      { user_id: userId, preset: parsed.data.gymPreset, equipment_type_ids: equipmentIds, updated_at: new Date().toISOString() },
      { onConflict: "user_id" },
    );
  if (error) {
    logError("guardar_gimnasio", error);
    return { ok: false, error: "fallo" };
  }
  // Sin consentimiento vigente el plan está pausado y no hay limitaciones que leer: refiltrar ahora
  // rellenaría huecos con ejercicios de la zona antigua. Se refiltra al volver a consentir.
  if (!(await hasActiveConsent(supabase, userId))) return { ok: true, changed: 0, holes: 0, changes: [] };
  return refilter(supabase, userId);
}

async function refilter(supabase: Awaited<ReturnType<typeof createClient>>, userId: string): Promise<RefilteredResult | Fail<"fallo">> {
  const result = await refilterForUser(supabase, userId);
  if (result.ok) return { ok: true, changed: result.changed, holes: result.holes, changes: result.changes };
  // Sin plan activo no hay nada que refiltrar: el plan nuevo ya saldrá con los datos guardados.
  if (result.error === "sin_plan") return { ok: true, changed: 0, holes: 0, changes: [] };
  return { ok: false, error: "fallo" };
}

// --- Limitaciones ----------------------------------------------------------------------------

const limitacionesSchema = z.object({ limitations: z.array(z.enum(JOINTS)).max(JOINTS.length) });

// Cambia solo las limitaciones: el resultado del cribado no se toca. Quitar una zona también
// refiltra (los huecos por limitación pueden volver a llenarse).
export async function guardarLimitaciones(
  input: unknown,
): Promise<RefilteredResult | Fail<"sin_consentimiento" | "sin_cribado" | "plan_sin_actualizar" | "fallo">> {
  const parsed = limitacionesSchema.safeParse(input);
  if (!parsed.success) return INVALID;
  const { supabase, userId } = await claims();
  if (!userId) return NO_SESSION;
  // El cliente admin salta la RLS: el consentimiento vigente se comprueba aquí (KTD2).
  if (!(await hasActiveConsent(supabase, userId))) return { ok: false, error: "sin_consentimiento" };

  const limitations: Joint[] = [...new Set(parsed.data.limitations)];
  const { data, error } = await createAdminClient()
    .from("health_profile")
    .update({ limitations, updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .select("user_id");
  if (error) {
    logError("guardar_limitaciones", error);
    return { ok: false, error: "fallo" };
  }
  // Sin perfil de salud (cribado sin superar) no se crea uno aquí: eso es el wizard.
  if (!Array.isArray(data) || data.length === 0) return { ok: false, error: "sin_cribado" };
  const refiltered = await refilter(supabase, userId);
  // Las limitaciones sí están guardadas: se dice tal cual y se puede reintentar (revisión de U11).
  return refiltered.ok ? refiltered : { ok: false, error: "plan_sin_actualizar" };
}

// --- Foco y días -----------------------------------------------------------------------------

const focoDiasSchema = z.object({
  focus: z.enum(FOCUS_OPTIONS),
  daysPerWeek: z.union(DAYS_OPTIONS.map((n) => z.literal(n))),
});

export type FocoDiasResult =
  | { ok: true }
  | Fail<"sin_permiso" | "incompleto" | "sin_cambios" | "fallo" | "tope_diario" | "conexion" | "validacion">
  | { ok: false; error: "limite"; availableFrom: string };

// Regenera el plan con IA (D26/D43): gratis, un cambio al mes; premium, hasta el tope mensual de
// regeneraciones. El historial y los pesos se mantienen (set_logs y exercise_state no se tocan).
export async function cambiarFocoDias(input: unknown): Promise<FocoDiasResult> {
  const parsed = focoDiasSchema.safeParse(input);
  if (!parsed.success) return INVALID;
  const { supabase, userId } = await claims();
  if (!userId) return NO_SESSION;
  const { focus, daysPerWeek } = parsed.data;

  const [consent, health, answers, gym, account] = await Promise.all([
    hasActiveConsent(supabase, userId),
    supabase.from("health_profile").select("limitations").eq("user_id", userId).maybeSingle(),
    supabase.from("onboarding_answers").select("focus, days_per_week, minutes_per_session, sports").eq("user_id", userId).maybeSingle(),
    supabase.from("gym_profiles").select("equipment_type_ids").eq("user_id", userId).maybeSingle(),
    supabase.from("account_status").select("trial_ends_at, subscription_status").eq("user_id", userId).maybeSingle(),
  ]);
  // Sin consentimiento vigente o sin cribado superado no se llama a la IA (guardarraíles 5 y 8).
  if (!consent || !health.data) return { ok: false, error: "sin_permiso" };
  if (!answers.data || !gym.data) return { ok: false, error: "incompleto" };
  // Se compara con el plan activo (fuente de verdad): si falló alinear las respuestas, no se gasta otro cambio.
  const { data: active } = await supabase.from("plans").select("focus, days_per_week").eq("user_id", userId).eq("is_active", true).maybeSingle();
  const current = active ?? { focus: answers.data.focus, days_per_week: answers.data.days_per_week };
  if (current.focus === focus && current.days_per_week === daysPerWeek) return { ok: false, error: "sin_cambios" };

  const catalog = await exerciseCatalog();
  const equipmentIds = sanitizeEquipment(gym.data.equipment_type_ids, [...new Set(catalog.map((e) => e.equipmentTypeId))]);
  if (equipmentIds.length === 0) return { ok: false, error: "incompleto" };

  const now = new Date();
  const premium = isPremium(
    now,
    account.data ? new Date(account.data.trial_ends_at) : null,
    account.data?.subscription_status ?? null,
  );
  const status: GenerationStatus = await generateAndSavePlan({
    userId,
    kind: "regenerar",
    periodLimit: premium ? PREMIUM_REGENERATIONS_PER_MONTH : FREE_PLAN_CHANGES_PER_MONTH,
    maxDurationS: PLAN_MAX_DURATION_S,
    focus,
    days: daysPerWeek,
    minutesPerSession: answers.data.minutes_per_session,
    sports: answers.data.sports,
    catalog,
    equipmentIds,
    limitations: health.data.limitations as Joint[],
  });

  if (status === "limite") return { ok: false, error: "limite", availableFrom: nextMonthStartText(now) };
  if (status === "reserva_fallida") return { ok: false, error: "fallo" };
  if (status !== "ok") return { ok: false, error: status };

  // El plan nuevo ya está guardado; las respuestas se alinean con él (las lee el refiltrado).
  const { error } = await createAdminClient()
    .from("onboarding_answers")
    .update({ focus, days_per_week: daysPerWeek, updated_at: now.toISOString() })
    .eq("user_id", userId);
  if (error) logError("cambiar_foco_dias", error);
  return { ok: true };
}

// --- Preferencias ----------------------------------------------------------------------------

const preferenciasSchema = z
  .object({ theme: z.enum(THEMES).optional(), showRestTimer: z.boolean().optional() })
  .refine((v) => v.theme !== undefined || v.showRestTimer !== undefined);

export async function guardarPreferencias(input: unknown): Promise<{ ok: true } | Fail<"fallo">> {
  const parsed = preferenciasSchema.safeParse(input);
  if (!parsed.success) return INVALID;
  const { supabase, userId } = await claims();
  if (!userId) return NO_SESSION;
  const { theme, showRestTimer } = parsed.data;

  const { data: updated, error } = await supabase
    .from("user_settings")
    .update({
      ...(theme !== undefined ? { theme } : {}),
      ...(showRestTimer !== undefined ? { show_rest_timer: showRestTimer } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .select("user_id");
  if (error || !Array.isArray(updated) || updated.length === 0) {
    logError("guardar_preferencias", error ?? { code: "sin_fila" });
    return { ok: false, error: "fallo" };
  }
  if (theme !== undefined) {
    (await cookies()).set(THEME_COOKIE, theme, { path: "/", maxAge: THEME_COOKIE_MAX_AGE, sameSite: "lax" });
  }
  return { ok: true };
}

// --- Retirar el consentimiento ---------------------------------------------------------------

export type RetirarResult = { ok: true; next: ReturnType<typeof nextScreenForAccount> } | Fail<"fallo">;

// "Tu plan se pausa y borramos tus datos de salud" (diseño D15; guardarraíl 8). Se retira primero
// y después se borran health_profile y discomfort_marks con el cliente admin. Es idempotente: si
// el borrado falla, repetirla sin consentimiento vigente vuelve a borrar. El plan queda pausado
// porque la app exige consentimiento vigente; los huecos del plan no llevan la zona (solo un código).
export async function retirarConsentimiento(): Promise<RetirarResult> {
  const { supabase, userId } = await claims();
  if (!userId) return NO_SESSION;

  // Primero se borran los datos de salud y después se retira: si un borrado falla, el consentimiento
  // sigue vigente y el usuario puede reintentar desde Ajustes (revisión de U11; guardarraíl 8).
  const admin = createAdminClient();
  // Las escalas del check-in (sensación y fatiga) también se borran (D71, decidido por Pablo: RGPD).
  const [health, marks, checkins] = await Promise.all([
    admin.from("health_profile").delete().eq("user_id", userId),
    admin.from("discomfort_marks").delete().eq("user_id", userId),
    admin.from("checkins").delete().eq("user_id", userId),
  ]);
  for (const write of [health, marks, checkins]) if (write.error) logError("borrar_datos_salud", write.error);
  if (health.error || marks.error || checkins.error) return { ok: false, error: "fallo" };

  const withdrawn = await supabase.from("consents").update({ withdrawn_at: new Date().toISOString() }).eq("user_id", userId).is("withdrawn_at", null);
  if (withdrawn.error) {
    logError("retirar_consentimiento", withdrawn.error);
    return { ok: false, error: "fallo" };
  }

  return { ok: true, next: nextScreenForAccount(await accountProgress(supabase, userId)) };
}
