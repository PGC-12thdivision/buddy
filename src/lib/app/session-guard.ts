import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { exerciseCatalog, sanitizeEquipment, type CatalogExercise } from "@/lib/catalog";
import { alternativesFor } from "@/lib/domain/refilter";
import type { Joint } from "@/lib/domain/types";
import type { Database } from "@/lib/supabase/types";

// Frontera de la sesión del día (KTD15; revisión de guardarraíles del 18/11): cada acción comprueba
// que la sesión es del usuario y, si escribe, que sigue abierta; y solo acepta ejercicios del día o
// sus alternativas permitidas (equipo y limitaciones, guardarraíl 6). El cliente nunca decide qué
// ejercicio es válido.

type Client = SupabaseClient<Database>;

export type SlotRule = { position: number; sets: number; repMin: number; repMax: number };

export type SessionScope = {
  session: { id: string; kind: "calibracion" | "normal"; planSessionId: string; startedAt: string; open: boolean };
  catalog: CatalogExercise[];
  limitations: Joint[];
  // Ejercicio permitido hoy → regla del hueco que ocupa (o al que sustituye).
  allowed: Map<string, SlotRule>;
  // Ejercicios del día, en orden, con su regla.
  day: { exerciseId: string; rule: SlotRule; alternatives: string[] }[];
};

export async function loadSessionScope(supabase: Client, userId: string, sessionId: string): Promise<SessionScope | null> {
  const { data: session } = await supabase
    .from("workout_sessions")
    .select("id, kind, plan_session_id, started_at, ended_at")
    .eq("id", sessionId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!session?.plan_session_id) return null;

  const [slots, catalog, health, gym, equipment] = await Promise.all([
    supabase
      .from("plan_slots")
      .select("position, exercise_id, sets, rep_min, rep_max")
      .eq("plan_session_id", session.plan_session_id)
      .eq("user_id", userId)
      .not("exercise_id", "is", null)
      .order("position"),
    exerciseCatalog(),
    supabase.from("health_profile").select("limitations").eq("user_id", userId).maybeSingle(),
    supabase.from("gym_profiles").select("equipment_type_ids").eq("user_id", userId).maybeSingle(),
    supabase.from("equipment_types").select("id"),
  ]);
  if (slots.error || health.error || gym.error || equipment.error || catalog.length === 0) return null;

  const limitations = (health.data?.limitations ?? []) as Joint[];
  const equipmentIds = sanitizeEquipment(gym.data?.equipment_type_ids ?? [], (equipment.data ?? []).map((e) => e.id));
  const byId = new Map(catalog.map((e) => [e.id, e]));
  const dayIds = (slots.data ?? []).map((s) => s.exercise_id as string);

  const allowed = new Map<string, SlotRule>();
  const day: SessionScope["day"] = [];
  for (const slot of slots.data ?? []) {
    const exercise = byId.get(slot.exercise_id as string);
    if (!exercise || slot.sets === null || slot.rep_min === null || slot.rep_max === null) continue;
    const rule = { position: slot.position, sets: slot.sets, repMin: slot.rep_min, repMax: slot.rep_max };
    // Un ejercicio del plan que ya no encaja con las limitaciones actuales tampoco se acepta hoy.
    const alternatives = alternativesFor(exercise, { catalog, equipmentIds, limitations }, dayIds)
      .slice(0, 3)
      .map((e) => e.id);
    day.push({ exerciseId: exercise.id, rule, alternatives });
    if (!exercise.joints.some((j) => limitations.includes(j))) allowed.set(exercise.id, rule);
    for (const alt of alternatives) if (!allowed.has(alt)) allowed.set(alt, rule);
  }

  return {
    session: {
      id: session.id,
      kind: session.kind as "calibracion" | "normal",
      planSessionId: session.plan_session_id,
      startedAt: session.started_at,
      open: session.ended_at === null,
    },
    catalog,
    limitations,
    allowed,
    day,
  };
}
