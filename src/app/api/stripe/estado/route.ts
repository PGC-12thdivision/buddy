import { NextResponse } from "next/server";
import { returnPollState } from "@/lib/domain/subscription";
import { createClient } from "@/lib/supabase/server";
import { sessionUserId } from "@/lib/wizard/account";

// GET /api/stripe/estado: lo consulta la pantalla de vuelta mientras espera al webhook (diseño D11).
// Lee account_status con la sesión del usuario (RLS); nunca mira el session_id de Stripe.
export async function GET() {
  const supabase = await createClient();
  const userId = await sessionUserId(supabase);
  if (!userId) return NextResponse.json({ state: "sin_sesion" }, { status: 401 });

  const { data } = await supabase.from("account_status").select("subscription_status").eq("user_id", userId).maybeSingle();
  return NextResponse.json(
    { state: returnPollState(data?.subscription_status ?? null) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
