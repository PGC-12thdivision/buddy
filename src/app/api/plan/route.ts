import { NextResponse } from "next/server";
import { callPlanModel } from "@/lib/ai/client";
import { costUsd, generatePlan, PLAN_MODEL } from "@/lib/ai/plan";
import { exerciseCatalog, sanitizeEquipment } from "@/lib/catalog";
import { buildTemplate, type Days } from "@/lib/domain/template";
import type { Focus, Joint } from "@/lib/domain/types";
import { logError } from "@/lib/log";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { hasActiveConsent, sessionUserId } from "@/lib/wizard/account";

// POST /api/plan: genera el plan inicial con IA (plan.md U5; diagrama "Generación del plan").
// Frontera de autorización (KTD15): sesión, consentimiento vigente y cribado superado leídos aquí;
// el user_id sale solo de los claims. La reserva del límite y el guardado del plan van en
// funciones SQL transaccionales (D54).

// Tope de la función en Vercel (KTD10). Una reserva pendiente más antigua se da por liberada.
export const maxDuration = 120;

type PlanStatus = "ok" | "sin_sesion" | "sin_permiso" | "incompleto" | "limite" | "conexion" | "validacion";
const reply = (status: PlanStatus, httpStatus = 200) => NextResponse.json({ status }, { status: httpStatus });

export async function POST() {
  const supabase = await createClient();
  const userId = await sessionUserId(supabase);
  if (!userId) return reply("sin_sesion", 401);

  const [consent, health, answers, gym] = await Promise.all([
    hasActiveConsent(supabase, userId),
    supabase.from("health_profile").select("limitations").eq("user_id", userId).maybeSingle(),
    supabase.from("onboarding_answers").select("*").eq("user_id", userId).maybeSingle(),
    supabase.from("gym_profiles").select("equipment_type_ids").eq("user_id", userId).maybeSingle(),
  ]);
  // Sin consentimiento vigente o sin cribado superado no se llama a la IA (guardarraíles 5 y 8).
  if (!consent || !health.data) return reply("sin_permiso", 403);
  if (!answers.data || !gym.data) return reply("incompleto", 409);

  const catalog = await exerciseCatalog();
  const equipmentIds = sanitizeEquipment(
    gym.data.equipment_type_ids,
    [...new Set(catalog.map((e) => e.equipmentTypeId))],
  );
  if (equipmentIds.length === 0) return reply("incompleto", 409);

  const admin = createAdminClient();
  const reservation = await admin.rpc("reserve_ai_call", {
    p_user: userId,
    p_kind: "plan",
    p_model: PLAN_MODEL,
    p_period_limit: 1,
    p_max_duration_s: maxDuration,
  });
  if (reservation.error) {
    logError("reservar_ia", reservation.error);
    return reply("conexion", 503);
  }
  const reserved = reservation.data as { ok: boolean; id?: string };
  if (!reserved.ok || !reserved.id) return reply("limite");

  const focus = answers.data.focus as Focus;
  const days = answers.data.days_per_week as Days;
  const result = await generatePlan({
    model: PLAN_MODEL,
    callModel: callPlanModel,
    template: buildTemplate(days, focus),
    profile: { focus, daysPerWeek: days, minutesPerSession: answers.data.minutes_per_session, sports: answers.data.sports },
    catalog,
    equipmentIds,
    limitations: health.data.limitations as Joint[],
  });

  const inputTokens = result.attempts.reduce((sum, a) => sum + a.inputTokens, 0);
  const outputTokens = result.attempts.reduce((sum, a) => sum + a.outputTokens, 0);
  const cost = costUsd(PLAN_MODEL, inputTokens, outputTokens);

  if (result.status !== "ok") {
    // Un intento fallido no consume el límite: la fila queda con su resultado, no como "ok".
    const outcome = result.status;
    const { error } = await admin
      .from("ai_calls")
      .update({ outcome, input_tokens: inputTokens, output_tokens: outputTokens, cost_usd: cost, completed_at: new Date().toISOString() })
      .eq("id", reserved.id)
      .eq("user_id", userId);
    if (error) logError("cerrar_ia", error);
    return reply(result.status === "connection" ? "conexion" : "validacion");
  }

  const saved = await admin.rpc("save_plan", {
    p_user: userId,
    p_plan: {
      focus,
      days_per_week: days,
      template: result.plan.template,
      source: "ia",
      sessions: result.plan.sessions.map((s) => ({
        day_index: s.dayIndex,
        label: s.label,
        slots: s.slots.map((slot) => ({
          position: slot.position,
          pattern: slot.pattern,
          region: slot.region,
          exercise_id: slot.exerciseId,
          gap_reason: slot.holeReason ?? null,
          sets: slot.exerciseId ? slot.sets : null,
          rep_min: slot.exerciseId ? slot.repMin : null,
          rep_max: slot.exerciseId ? slot.repMax : null,
        })),
      })),
    },
    p_ai_call: reserved.id,
    p_input_tokens: inputTokens,
    p_output_tokens: outputTokens,
    p_cost_usd: cost,
  });
  if (saved.error) {
    logError("guardar_plan", saved.error);
    await admin.from("ai_calls").update({ outcome: "validation_failed", completed_at: new Date().toISOString() }).eq("id", reserved.id);
    return reply("validacion");
  }

  const event = await admin.from("events").insert({ user_id: userId, name: "plan_generado", step: "plan" });
  if (event.error) logError("evento_plan", event.error);
  return reply("ok");
}
