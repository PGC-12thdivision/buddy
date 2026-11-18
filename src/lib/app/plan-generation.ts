import "server-only";
import { callPlanModel } from "@/lib/ai/client";
import { costUsd, generatePlan, PLAN_MODEL } from "@/lib/ai/plan";
import type { CatalogExercise } from "@/lib/catalog";
import { buildTemplate, type Days } from "@/lib/domain/template";
import type { Focus, Joint } from "@/lib/domain/types";
import { logError } from "@/lib/log";
import { createAdminClient } from "@/lib/supabase/admin";

// Generación del plan con IA, compartida por el plan inicial (POST /api/plan, U5) y el cambio de
// foco o días desde Ajustes (U11; D43). Quien llama ya ha comprobado sesión, consentimiento y
// cribado (KTD15) y pasa el userId sacado de los claims. La reserva del límite (KTD18) y el
// guardado del plan van en funciones SQL transaccionales (D54).

// "reserva_fallida": la base de datos no respondió al reservar; no se ha llamado a la IA.
export type GenerationStatus = "ok" | "limite" | "tope_diario" | "conexion" | "reserva_fallida" | "validacion";

export type GenerationInput = {
  userId: string;
  // Tipo de ai_calls: "plan" (una en total) o "regenerar" (p_periodLimit al mes).
  kind: "plan" | "regenerar";
  periodLimit: number;
  maxDurationS: number;
  focus: Focus;
  days: Days;
  minutesPerSession: number;
  sports: string[];
  catalog: CatalogExercise[];
  equipmentIds: string[];
  limitations: Joint[];
};

export async function generateAndSavePlan(input: GenerationInput): Promise<GenerationStatus> {
  const { userId, focus, days } = input;
  const admin = createAdminClient();
  const reservation = await admin.rpc("reserve_ai_call", {
    p_user: userId,
    p_kind: input.kind,
    p_model: PLAN_MODEL,
    p_period_limit: input.periodLimit,
    p_max_duration_s: input.maxDurationS,
  });
  if (reservation.error) {
    logError("reservar_ia", reservation.error);
    return "reserva_fallida";
  }
  const reserved = reservation.data as { ok: boolean; id?: string; reason?: string };
  // El tope técnico diario no es "ya has usado tu cambio": se puede volver a intentar mañana.
  if (!reserved.ok || !reserved.id) return reserved.reason === "tope_diario" ? "tope_diario" : "limite";

  const result = await generatePlan({
    model: PLAN_MODEL,
    callModel: callPlanModel,
    template: buildTemplate(days, focus),
    profile: { focus, daysPerWeek: days, minutesPerSession: input.minutesPerSession, sports: input.sports },
    catalog: input.catalog,
    equipmentIds: input.equipmentIds,
    limitations: input.limitations,
  });

  const inputTokens = result.attempts.reduce((sum, a) => sum + a.inputTokens, 0);
  const outputTokens = result.attempts.reduce((sum, a) => sum + a.outputTokens, 0);
  const cost = costUsd(PLAN_MODEL, inputTokens, outputTokens);

  if (result.status !== "ok") {
    // Un intento fallido no consume el límite: la fila queda con su resultado, no como "ok".
    const { error } = await admin
      .from("ai_calls")
      .update({ outcome: result.status, input_tokens: inputTokens, output_tokens: outputTokens, cost_usd: cost, completed_at: new Date().toISOString() })
      .eq("id", reserved.id)
      .eq("user_id", userId);
    if (error) logError("cerrar_ia", error);
    return result.status === "connection" ? "conexion" : "validacion";
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
    await admin
      .from("ai_calls")
      .update({ outcome: "validation_failed", input_tokens: inputTokens, output_tokens: outputTokens, cost_usd: cost, completed_at: new Date().toISOString() })
      .eq("id", reserved.id)
      .eq("user_id", userId);
    return "validacion";
  }

  const event = await admin.from("events").insert({ user_id: userId, name: "plan_generado", step: "plan" });
  if (event.error) logError("evento_plan", event.error);
  return "ok";
}
