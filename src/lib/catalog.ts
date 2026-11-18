import "server-only";
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

export async function activityCatalog(): Promise<ActivityOption[]> {
  const { data, error } = await createAdminClient().from("activity_types").select("id, name");
  if (error) logError("leer_actividades", error);
  // "Otro" al final.
  return (data ?? []).sort((a, b) => Number(a.id === "otro") - Number(b.id === "otro"));
}
