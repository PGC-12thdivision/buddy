import "server-only";
import type Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";

// Cliente de Stripe del usuario (plan.md U9, KTD8). Lo crea el servidor la primera vez y lo guarda
// en account_status con el cliente admin; el user_id llega siempre de los claims (KTD15, KTD16).
// La clave de idempotencia evita dos clientes si llegan dos peticiones a la vez, y la escritura solo
// rellena el hueco vacío: si otra petición ya lo guardó, manda el guardado.
export async function ensureStripeCustomer(stripe: Stripe, userId: string, existing: string | null): Promise<string> {
  if (existing) return existing;
  const customer = await stripe.customers.create(
    { metadata: { buddy_user_id: userId } },
    { idempotencyKey: `buddy-cliente-${userId}` },
  );
  const admin = createAdminClient();
  const { error } = await admin
    .from("account_status")
    .update({ stripe_customer_id: customer.id, updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("stripe_customer_id", null);
  if (error) throw error;
  const { data, error: readError } = await admin
    .from("account_status")
    .select("stripe_customer_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (readError) throw readError;
  if (!data?.stripe_customer_id) throw { code: "sin_cliente" };
  return data.stripe_customer_id;
}

// Los formularios de pago solo se aceptan desde la propia app (además de las cookies SameSite).
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  return origin === null || origin === new URL(request.url).origin;
}
