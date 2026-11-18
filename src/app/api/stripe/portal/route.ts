import { NextResponse } from "next/server";
import { isSameOrigin } from "@/lib/app/billing";
import { logError } from "@/lib/log";
import { getStripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import { sessionUserId } from "@/lib/wizard/account";

// POST /api/stripe/portal: "Gestionar" en Ajustes (diseño D15; plan.md U9). Abre el portal de
// cliente de Stripe con el cliente guardado en account_status (nunca uno del navegador) y vuelve a
// Ajustes.

const to = (path: string, request: Request) => NextResponse.redirect(new URL(path, request.url), 303);

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return new Response(null, { status: 403 });

  const supabase = await createClient();
  const userId = await sessionUserId(supabase);
  if (!userId) return to("/entrar", request);

  const { data: account } = await supabase
    .from("account_status")
    .select("stripe_customer_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (!account?.stripe_customer_id) return to("/premium", request);

  try {
    const portal = await getStripe().billingPortal.sessions.create({
      customer: account.stripe_customer_id,
      locale: "es",
      return_url: `${new URL(request.url).origin}/ajustes`,
    });
    return NextResponse.redirect(portal.url, 303);
  } catch (caught) {
    logError("stripe_portal", caught);
    return to("/premium?error=gestion", request);
  }
}
