"use server";

import { exerciseCatalog, sanitizeEquipment } from "@/lib/catalog";
import { refilterPlan } from "@/lib/domain/refilter";
import type { Joint } from "@/lib/domain/types";
import { loadActivePlan } from "@/lib/app/active-plan";
import { logError } from "@/lib/log";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { sessionUserId } from "@/lib/wizard/account";

// Refiltrado determinista y gratis del plan activo (D35; guardarraíl 6; plan.md U6). Se llama al
// guardar limitaciones o equipo. Sin IA: misma lógica que «Cambiar ejercicio». Si algo cambia,
// guarda una versión nueva del plan (source "refiltrado") con la misma función transaccional.

export type RefilterResult =
  | { ok: true; changed: number; holes: number }
  | { ok: false; error: "sin_sesion" | "sin_plan" | "fallo" };

export async function refiltrarPlan(): Promise<RefilterResult> {
  const supabase = await createClient();
  const userId = await sessionUserId(supabase);
  if (!userId) return { ok: false, error: "sin_sesion" };

  const [plan, health, gym, catalog] = await Promise.all([
    loadActivePlan(supabase, userId),
    supabase.from("health_profile").select("limitations").eq("user_id", userId).maybeSingle(),
    supabase.from("gym_profiles").select("equipment_type_ids").eq("user_id", userId).maybeSingle(),
    exerciseCatalog(),
  ]);
  if (!plan) return { ok: false, error: "sin_plan" };

  const equipmentIds = sanitizeEquipment(gym.data?.equipment_type_ids ?? [], [...new Set(catalog.map((e) => e.equipmentTypeId))]);
  // Sin perfil de salud (consentimiento retirado) no hay limitaciones que aplicar.
  const limitations = (health.data?.limitations ?? []) as Joint[];

  const before = { sessions: plan.sessions.map((s) => ({ slots: s.slots.map((slot) => ({ exerciseId: slot.exerciseId, sets: slot.sets ?? 0 })) })) };
  const after = refilterPlan(before, { catalog, equipmentIds, limitations });

  let changed = 0;
  let holes = 0;
  const byId = new Map(catalog.map((e) => [e.id, e]));
  const sessions = plan.sessions.map((session, i) => ({
    day_index: session.dayIndex,
    label: session.label,
    slots: session.slots.map((slot, j) => {
      const next = after.sessions[i].slots[j];
      if (next.exerciseId !== slot.exerciseId) changed++;
      if (next.exerciseId === null) holes++;
      const exercise = next.exerciseId ? byId.get(next.exerciseId) : undefined;
      return {
        position: slot.position,
        pattern: exercise?.pattern ?? slot.pattern,
        region: slot.region,
        exercise_id: next.exerciseId,
        gap_reason: next.exerciseId ? null : (next.holeReason ?? slot.gapReason ?? "sin_alternativa_equipo"),
        sets: next.exerciseId ? (slot.sets ?? 2) : null,
        rep_min: next.exerciseId ? (slot.repMin ?? 8) : null,
        rep_max: next.exerciseId ? (slot.repMax ?? 12) : null,
      };
    }),
  }));
  if (changed === 0) return { ok: true, changed: 0, holes };

  const saved = await createAdminClient().rpc("save_plan", {
    p_user: userId,
    p_plan: { focus: plan.focus, days_per_week: plan.daysPerWeek, template: plan.template, source: "refiltrado", sessions },
    // Sin llamada de IA (refiltrado): la función acepta null aunque el tipo generado diga uuid.
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
