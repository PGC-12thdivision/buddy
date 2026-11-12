import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { publicEnv } from "@/lib/env";

// Refresca la sesión de Supabase en cada petición (plan.md, KTD2). Es una comprobación optimista:
// cada Server Action y route handler vuelve a comprobar la sesión (KTD15) y la RLS es la última barrera.
export async function updateSession(request: NextRequest) {
  const { supabaseUrl, supabasePublishableKey } = publicEnv();
  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet, headers) => {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
      },
    },
  });

  // Nada entre crear el cliente y getClaims(): es lo que refresca el token.
  await supabase.auth.getClaims();

  // Siempre se devuelve este mismo objeto, o la sesión se pierde.
  return response;
}
