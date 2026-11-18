import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

// Plan activo del usuario con sus sesiones y huecos, leído con la sesión del usuario (RLS).

type Client = SupabaseClient<Database>;

export type ActiveSlot = {
  position: number;
  pattern: string;
  region: string;
  exerciseId: string | null;
  exerciseName: string | null;
  gapReason: "sin_alternativa_limitacion" | "sin_alternativa_equipo" | null;
  sets: number | null;
  repMin: number | null;
  repMax: number | null;
};
export type ActiveSession = { dayIndex: number; label: string; slots: ActiveSlot[] };
export type ActivePlan = {
  id: string;
  version: number;
  focus: string;
  daysPerWeek: number;
  template: "cuerpo_completo" | "torso_pierna";
  source: string;
  createdAt: string;
  sessions: ActiveSession[];
};

export async function loadActivePlan(supabase: Client, userId: string): Promise<ActivePlan | null> {
  const { data: plan } = await supabase
    .from("plans")
    .select("id, version, focus, days_per_week, template, source, created_at")
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle();
  if (!plan) return null;

  const { data: sessions } = await supabase.from("plan_sessions").select("id, day_index, label").eq("plan_id", plan.id).order("day_index");
  const sessionIds = (sessions ?? []).map((s) => s.id);
  // Solo los huecos del plan activo: las versiones antiguas no cuentan para el límite de filas.
  const [{ data: slots }, { data: exercises }] = await Promise.all([
    supabase
      .from("plan_slots")
      .select("plan_session_id, position, pattern, region, exercise_id, gap_reason, sets, rep_min, rep_max")
      .in("plan_session_id", sessionIds.length ? sessionIds : ["00000000-0000-0000-0000-000000000000"])
      .order("position"),
    supabase.from("exercises").select("id, name"),
  ]);
  const names = new Map((exercises ?? []).map((e) => [e.id, e.name]));

  return {
    id: plan.id,
    version: plan.version,
    focus: plan.focus,
    daysPerWeek: plan.days_per_week,
    template: plan.template as ActivePlan["template"],
    source: plan.source,
    createdAt: plan.created_at,
    sessions: (sessions ?? []).map((s) => ({
      dayIndex: s.day_index,
      label: s.label,
      slots: (slots ?? [])
        .filter((slot) => slot.plan_session_id === s.id)
        .map((slot) => ({
          position: slot.position,
          pattern: slot.pattern,
          region: slot.region,
          exerciseId: slot.exercise_id,
          exerciseName: slot.exercise_id ? (names.get(slot.exercise_id) ?? slot.exercise_id) : null,
          gapReason: slot.gap_reason as ActiveSlot["gapReason"],
          sets: slot.sets,
          repMin: slot.rep_min,
          repMax: slot.rep_max,
        })),
    })),
  };
}
