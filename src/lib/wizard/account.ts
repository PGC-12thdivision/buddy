import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import type { AccountProgress } from "./progress";

type Client = SupabaseClient<Database>;

// user_id de la sesión, leído de los claims (plan.md KTD15). Nunca de la entrada.
export async function sessionUserId(supabase: Client): Promise<string | null> {
  const { data } = await supabase.auth.getClaims();
  const sub = data?.claims?.sub;
  return typeof sub === "string" && sub.length > 0 ? sub : null;
}

// Consentimiento vigente: dado y no retirado. Lo lee el cliente con la sesión (RLS).
export async function hasActiveConsent(supabase: Client, userId: string): Promise<boolean> {
  const { data } = await supabase.from("consents").select("id").eq("user_id", userId).is("withdrawn_at", null).limit(1);
  return Array.isArray(data) && data.length > 0;
}

export async function accountProgress(supabase: Client, userId: string): Promise<AccountProgress> {
  const [hasConsent, health, plan] = await Promise.all([
    hasActiveConsent(supabase, userId),
    supabase.from("health_profile").select("user_id").eq("user_id", userId).limit(1),
    supabase.from("plans").select("id").eq("user_id", userId).eq("is_active", true).limit(1),
  ]);
  return {
    hasConsent,
    hasHealthProfile: Array.isArray(health.data) && health.data.length > 0,
    hasActivePlan: Array.isArray(plan.data) && plan.data.length > 0,
  };
}
