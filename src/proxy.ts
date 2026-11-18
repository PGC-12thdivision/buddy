import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Fuera: estáticos, el webhook de Stripe y los crons, que no llevan sesión y nunca deben redirigirse.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/stripe/webhook|api/cron|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
