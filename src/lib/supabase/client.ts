import { createBrowserClient } from "@supabase/ssr";
import { publicEnv } from "@/lib/env";
import type { Database } from "./types";

// Cliente del navegador: clave publicable y sesión del usuario; todo pasa por RLS.
export function createClient() {
  const { supabaseUrl, supabasePublishableKey } = publicEnv();
  return createBrowserClient<Database>(supabaseUrl, supabasePublishableKey);
}
