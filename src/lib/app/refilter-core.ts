import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { exerciseCatalog, sanitizeEquipment } from "@/lib/catalog";
import { applyConstraints, setsPerSlot, type BuiltSession } from "@/lib/domain/plan-build";
import type { SessionKind } from "@/lib/domain/template";
import type { Focus, Joint } from "@/lib/domain/types";
import { logError } from "@/lib/log";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/types";
import { loadActivePlan, type ActivePlan } from "./active-plan";

// Refiltrado determinista y gratis del plan activo (D35; guardarraíl 6; plan.md U6). Misma lógica que
// la generación (applyConstraints): sustituye, rellena huecos, repara el suelo y ajusta los topes.
// Si algo cambia, guarda una versión nueva (source "refiltrado") con la función transaccional.
// El userId lo pone siempre quien llama, sacado de los claims (KTD15).

export type RefilterResult =
  | { ok: true; changed: number; holes: number }
  | { ok: false; error: "sin_plan" | "fallo" };

const KIND_BY_LABEL: Record<string, SessionKind> = { "Cuerpo completo": "cuerpo_completo", Torso: "torso", Pierna: "pierna" };

// Plan activo con la forma del montaje (lo comparten el refiltrado y el check-in, U8).
export function activeToBuilt(plan: ActivePlan, minutes: number): BuiltSession[] {
  return plan.sessions.map((s) => ({
    dayIndex: s.dayIndex,
    kind: KIND_BY_LABEL[s.label] ?? "cuerpo_completo",
    label: s.label,
    slots: s.slots.map((slot) => ({
      position: slot.position,
      region: slot.region,
      pattern: slot.pattern,
      exerciseId: slot.exerciseId,
      holeReason: slot.gapReason ?? undefined,
      sets: slot.sets ?? setsPerSlot(s.slots.length, minutes, plan.focus as Focus),
      repMin: slot.repMin ?? 8,
      repMax: slot.repMax ?? 12,
    })),
  }));
}

// Argumento p_plan de save_plan: misma estructura, foco, días y plantilla que el plan activo.
export function savePlanPayload(plan: ActivePlan, sessions: readonly BuiltSession[], source: "refiltrado" | "checkin") {
  return {
    focus: plan.focus,
    days_per_week: plan.daysPerWeek,
    template: plan.template,
    source,
    sessions: sessions.map((s) => ({
      day_index: s.dayIndex,
      label: s.label,
      slots: s.slots.map((slot) => ({
        position: slot.position,
        pattern: slot.pattern,
        region: slot.region,
        exercise_id: slot.exerciseId,
        gap_reason: slot.exerciseId ? null : (slot.holeReason ?? "sin_alternativa_equipo"),
        sets: slot.exerciseId ? slot.sets : null,
        rep_min: slot.exerciseId ? slot.repMin : null,
        rep_max: slot.exerciseId ? slot.repMax : null,
      })),
    })),
  };
}

export async function refilterForUser(supabase: SupabaseClient<Database>, userId: string): Promise<RefilterResult> {
  const [plan, health, gym, answers, catalog] = await Promise.all([
    loadActivePlan(supabase, userId),
    supabase.from("health_profile").select("limitations").eq("user_id", userId).maybeSingle(),
    supabase.from("gym_profiles").select("equipment_type_ids").eq("user_id", userId).maybeSingle(),
    supabase.from("onboarding_answers").select("minutes_per_session").eq("user_id", userId).maybeSingle(),
    exerciseCatalog(),
  ]);
  if (!plan) return { ok: false, error: "sin_plan" };
  // Una lectura fallida nunca se toma como "sin equipo": vaciaría el plan entero.
  if (health.error || gym.error || !gym.data || answers.error || catalog.length === 0) {
    logError("refiltrar_lectura", health.error ?? gym.error ?? answers.error ?? { code: "sin_datos" });
    return { ok: false, error: "fallo" };
  }

  const equipmentIds = sanitizeEquipment(gym.data.equipment_type_ids, [...new Set(catalog.map((e) => e.equipmentTypeId))]);
  // Sin perfil de salud (consentimiento retirado) no hay limitaciones que aplicar.
  const limitations = (health.data?.limitations ?? []) as Joint[];
  const minutes = answers.data?.minutes_per_session ?? 45;

  const sessions = activeToBuilt(plan, minutes);
  const before = sessions.map((s) => s.slots.map((slot) => `${slot.exerciseId}:${slot.sets}`).join("|")).join("/");
  // Con las limitaciones prima el guardarraíl 6: el plan se guarda aunque algún grupo quede por debajo
  // del suelo por falta de ejercicios posibles (KTD20); los topes de techo y mínimo sí se ajustan.
  applyConstraints(sessions, catalog, equipmentIds, limitations);
  const after = sessions.map((s) => s.slots.map((slot) => `${slot.exerciseId}:${slot.sets}`).join("|")).join("/");

  let changed = 0;
  plan.sessions.forEach((s, i) => s.slots.forEach((slot, j) => (changed += sessions[i].slots[j].exerciseId !== slot.exerciseId ? 1 : 0)));
  const holes = sessions.flatMap((s) => s.slots).filter((slot) => slot.exerciseId === null).length;
  if (before === after) return { ok: true, changed: 0, holes };

  const saved = await createAdminClient().rpc("save_plan", {
    p_user: userId,
    p_plan: savePlanPayload(plan, sessions, "refiltrado"),
    // Sin llamada de IA: la función acepta null aunque el tipo generado diga uuid.
    p_ai_call: null as unknown as string,
    p_input_tokens: 0,
    p_output_tokens: 0,
    p_cost_usd: 0,
  });
  if (saved.error) {
    logError("refiltrar_plan", saved.error);
    return { ok: false, error: "fallo" };
  }
  return { ok: true, changed, holes };
}
