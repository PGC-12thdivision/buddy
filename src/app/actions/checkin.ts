"use server";

import { applyCheckin, keepPlan, type DecisionResult } from "@/lib/app/checkin-core";
import { createClient } from "@/lib/supabase/server";
import { sessionUserId } from "@/lib/wizard/account";

// "Aplicar a mi semana" y "Mantener mi plan" (plan.md U8; sistema §10). Sin entrada: la fila es la
// de la semana en curso del usuario de los claims (KTD15). El ajuste lo vuelve a validar el servidor.

type Result = DecisionResult | { ok: false; error: "sin_sesion" };

export async function aplicarAjuste(): Promise<Result> {
  const supabase = await createClient();
  const userId = await sessionUserId(supabase);
  if (!userId) return { ok: false, error: "sin_sesion" };
  return applyCheckin(supabase, userId);
}

export async function mantenerPlan(): Promise<Result> {
  const supabase = await createClient();
  const userId = await sessionUserId(supabase);
  if (!userId) return { ok: false, error: "sin_sesion" };
  return keepPlan(supabase, userId);
}
