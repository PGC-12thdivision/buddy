import { NextResponse, type NextRequest } from "next/server";
import { parseConfirmParams } from "@/lib/auth/confirm";
import { logError } from "@/lib/log";
import { createClient } from "@/lib/supabase/server";

// Vuelta del enlace de confirmación (plan.md KTD4). Errores genéricos: el mensaje de Supabase
// nunca viaja en la URL.
// - token_hash: se verifica aquí y se abre la sesión (sirve en cualquier navegador).
// - code: Supabase ya confirmó el email. Si el código no se puede canjear (el enlace se abrió en
//   otro navegador), el email sigue confirmado y las respuestas guardadas: se pide entrar.
export async function GET(request: NextRequest) {
  const params = parseConfirmParams(request.nextUrl.searchParams);
  const to = (path: string) => NextResponse.redirect(new URL(path, request.nextUrl.origin));
  if (!params.ok) return to("/entrar?aviso=enlace");

  const supabase = await createClient();
  if (params.kind === "code") {
    const { error } = await supabase.auth.exchangeCodeForSession(params.code);
    if (error) {
      logError("confirmar_email_code", error);
      return to("/entrar?aviso=confirmado");
    }
    return to(params.next);
  }

  const { error } = await supabase.auth.verifyOtp({ type: params.type, token_hash: params.tokenHash });
  if (error) {
    logError("confirmar_email", error);
    return to("/entrar?aviso=enlace");
  }
  return to(params.next);
}
