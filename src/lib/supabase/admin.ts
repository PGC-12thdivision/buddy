import "server-only";
import { createClient } from "@supabase/supabase-js";
import { serverEnv } from "@/lib/env.server";

// Cliente admin con la clave secreta: salta la RLS. Solo para los usos de plan.md KTD2 y
// siempre con el user_id tomado de los claims o de la respuesta de signUp, nunca de la entrada (KTD16).
export function createAdminClient() {
  const { supabaseUrl, supabaseSecretKey } = serverEnv();
  return createClient(supabaseUrl, supabaseSecretKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
