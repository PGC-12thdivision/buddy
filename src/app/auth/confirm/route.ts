import { NextResponse, type NextRequest } from "next/server";
import { parseConfirmParams } from "@/lib/auth/confirm";
import { logError } from "@/lib/log";
import { createClient } from "@/lib/supabase/server";

// Confirmación de email con token_hash + verifyOtp (plan.md KTD4): funciona aunque el enlace se
// abra en otro navegador, porque las respuestas ya están en la cuenta. Errores genéricos: el
// mensaje de Supabase nunca viaja en la URL.
export async function GET(request: NextRequest) {
  const params = parseConfirmParams(request.nextUrl.searchParams);
  const failure = new URL("/entrar?aviso=enlace", request.nextUrl.origin);
  if (!params.ok) return NextResponse.redirect(failure);

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ type: params.type, token_hash: params.tokenHash });
  if (error) {
    logError("confirmar_email", error);
    return NextResponse.redirect(failure);
  }
  return NextResponse.redirect(new URL(params.next, request.nextUrl.origin));
}
