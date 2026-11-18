"use server";

import { refilterForUser, type RefilterResult } from "@/lib/app/refilter-core";
import { createClient } from "@/lib/supabase/server";
import { sessionUserId } from "@/lib/wizard/account";

// Server Action del refiltrado (plan.md U6): el user_id sale solo de los claims (KTD15). La usan
// Ajustes (U11) al guardar equipo; las limitaciones se refiltran al guardarlas (guardarSeguridad).
export async function refiltrarPlan(): Promise<RefilterResult | { ok: false; error: "sin_sesion" }> {
  const supabase = await createClient();
  const userId = await sessionUserId(supabase);
  if (!userId) return { ok: false, error: "sin_sesion" };
  return refilterForUser(supabase, userId);
}
