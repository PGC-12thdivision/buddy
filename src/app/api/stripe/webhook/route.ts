import type Stripe from "stripe";
import { currentSubscription } from "@/lib/domain/subscription";
import { logError } from "@/lib/log";
import { getStripe, webhookSecret } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

// POST /api/stripe/webhook (plan.md U9, KTD8, KTD16). Sin sesión: la frontera es la firma de Stripe
// sobre el cuerpo crudo (está fuera del matcher de src/proxy.ts). Pasos:
// 1. Verifica la firma; si no vale, 400 y no cambia nada.
// 2. Ignora clientes que no son de esta base (staging y prod comparten la cuenta de test).
// 3. Vuelve a pedir a Stripe las suscripciones del cliente: los eventos llegan desordenados, así que
//    se escribe el estado actual y nunca el del evento.
// 4. Guarda el event.id y el estado en una sola transacción (apply_stripe_event). Si algo falla,
//    responde 500 sin guardar el evento y Stripe lo reintenta.

// Eventos que cambian el estado de la suscripción. Se suscriben en el panel de Stripe.
const HANDLED = new Set([
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
]);

const idOf = (value: string | { id: string } | null | undefined): string | null =>
  typeof value === "string" ? value : (value?.id ?? null);

function customerOf(event: Stripe.Event): string | null {
  const object = event.data.object as { customer?: string | { id: string } | null };
  return idOf(object.customer);
}

const reply = (status: number) => new Response(null, { status });

export async function POST(request: Request) {
  let secret: string;
  let stripe: Stripe;
  try {
    secret = webhookSecret();
    stripe = getStripe();
  } catch {
    // Falla cerrado: sin secreto no se verifica nada ni se procesa nada. Stripe reintentará.
    logError("stripe_webhook", { code: "sin_configurar" });
    return reply(500);
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) return reply(400);
  const body = await request.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, secret);
  } catch {
    return reply(400);
  }

  if (!HANDLED.has(event.type)) return reply(200);
  const customerId = customerOf(event);
  if (!customerId) return reply(200);

  try {
    const admin = createAdminClient();
    const [account, seen] = await Promise.all([
      admin.from("account_status").select("user_id").eq("stripe_customer_id", customerId).maybeSingle(),
      admin.from("stripe_events").select("event_id").eq("event_id", event.id).maybeSingle(),
    ]);
    if (account.error) throw account.error;
    if (seen.error) throw seen.error;
    // Cliente de otra base: se ignora sin llamar a Stripe ni guardar nada.
    if (!account.data) return reply(200);
    // Ya aplicado: no hace falta volver a consultar. La función lo comprueba otra vez dentro de la
    // transacción por si llegan dos copias a la vez.
    if (seen.data) return reply(200);

    const list = await stripe.subscriptions.list({ customer: customerId, status: "all", limit: 20 });
    const current = currentSubscription(list.data);

    const { error } = await admin.rpc("apply_stripe_event", {
      p_event_id: event.id,
      p_customer_id: customerId,
      p_subscription_id: current.subscriptionId,
      p_status: current.status,
    });
    if (error) throw error;
    return reply(200);
  } catch (error) {
    logError("stripe_webhook", error);
    return reply(500);
  }
}
