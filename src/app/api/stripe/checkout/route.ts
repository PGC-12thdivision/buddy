import { NextResponse } from "next/server";
import { ensureStripeCustomer, isSameOrigin } from "@/lib/app/billing";
import { isPayingStatus } from "@/lib/domain/premium";
import { safeReturnPath } from "@/lib/domain/subscription";
import { logError } from "@/lib/log";
import { getStripe, premiumPriceId } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import { sessionUserId } from "@/lib/wizard/account";

// POST /api/stripe/checkout (plan.md U9, KTD8, KTD15). Lo envía un formulario ("Hazte premium") y
// responde con una redirección 303 a Stripe Checkout. El precio y el cliente los fija el servidor:
// del navegador solo se lee "volver", de una lista cerrada, para saber a qué pantalla regresar.
// Las URL de vuelta no llevan session_id: la pantalla de vuelta consulta account_status.

const to = (path: string, request: Request) => NextResponse.redirect(new URL(path, request.url), 303);

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return new Response(null, { status: 403 });

  const supabase = await createClient();
  const userId = await sessionUserId(supabase);
  if (!userId) return to("/entrar", request);

  const form = await request.formData().catch(() => null);
  const volver = safeReturnPath(form?.get("volver"));

  const { data: account, error } = await supabase
    .from("account_status")
    .select("subscription_status, stripe_customer_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !account) {
    logError("stripe_checkout", error ?? { code: "sin_cuenta" });
    return to("/premium?error=pago", request);
  }
  // Ya paga: no se abre un segundo cobro.
  if (isPayingStatus(account.subscription_status)) return to("/premium", request);

  try {
    const stripe = getStripe();
    const customer = await ensureStripeCustomer(stripe, userId, account.stripe_customer_id);
    const origin = new URL(request.url).origin;
    const back = encodeURIComponent(volver);
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer,
      line_items: [{ price: premiumPriceId(), quantity: 1 }],
      client_reference_id: userId,
      locale: "es",
      success_url: `${origin}/premium/vuelta?volver=${back}`,
      cancel_url: `${origin}/premium/vuelta?estado=cancelado&volver=${back}`,
    });
    if (!session.url) throw { code: "sin_url" };
    return NextResponse.redirect(session.url, 303);
  } catch (caught) {
    logError("stripe_checkout", caught);
    return to("/premium?error=pago", request);
  }
}
