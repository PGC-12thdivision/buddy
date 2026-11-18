import "server-only";
import type { Exercise, Joint, Region } from "@/lib/domain/types";
import { logError } from "@/lib/log";
import { createAdminClient } from "@/lib/supabase/admin";

// Catálogo cerrado para el wizard (PRD §5 y §6). Antes del registro no hay sesión y la RLS solo
// deja leer el catálogo a usuarios autenticados, así que lo lee el servidor. Es público: nombres
// de equipo y de actividades, sin nada del usuario.

export type EquipmentOption = { id: string; name: string; zone: string };
export type ActivityOption = { id: string; name: string };

export async function equipmentCatalog(): Promise<EquipmentOption[]> {
  const { data, error } = await createAdminClient().from("equipment_types").select("id, name, zone").order("name");
  if (error) logError("leer_equipo", error);
  return data ?? [];
}

// Técnica (1–2 frases) y nota de contribución leve: solo se muestran en la sesión, nunca van al prompt.
export type CatalogExercise = Exercise & { name: string; jointsLight: Joint[]; technique: string | null; lightNote: string | null };

// Ejercicios del catálogo con la forma del dominio (src/lib/domain/types.ts). Orden fijo por ID
// para que el prompt y el refiltrado sean deterministas.
export async function exerciseCatalog(): Promise<CatalogExercise[]> {
  const { data, error } = await createAdminClient()
    .from("exercises")
    .select("id, name, equipment_type_id, pattern, region, muscle_groups, joints, joints_light, calibration_load_kg, technique, light_note")
    .order("id");
  if (error) logError("leer_ejercicios", error);
  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    equipmentTypeId: row.equipment_type_id,
    pattern: row.pattern,
    region: row.region as Region,
    muscleGroups: row.muscle_groups,
    joints: row.joints as Joint[],
    jointsLight: (row.joints_light ?? []) as Joint[],
    calibrationLoadKg: Number(row.calibration_load_kg),
    technique: row.technique,
    lightNote: row.light_note,
  }));
}

// Equipo del usuario: solo IDs que existen en el catálogo, sin repetidos. El usuario puede escribir
// gym_profiles directamente por la API, así que nunca se confía en esa lista tal cual (D56).
export function sanitizeEquipment(ids: readonly string[], catalogIds: readonly string[]): string[] {
  const known = new Set(catalogIds);
  return [...new Set(ids)].filter((id) => known.has(id));
}

export async function activityCatalog(): Promise<ActivityOption[]> {
  const { data, error } = await createAdminClient().from("activity_types").select("id, name");
  if (error) logError("leer_actividades", error);
  // "Otro" al final.
  return (data ?? []).sort((a, b) => Number(a.id === "otro") - Number(b.id === "otro"));
}
