import "server-only";
import Stripe from "stripe";
import { serverVar } from "@/lib/env.server";

// Cliente de Stripe (modo test; plan.md U9). Solo servidor: la clave secreta nunca llega al cliente.
// Se crea al usarlo, no al importar, para que el build no necesite la clave. Usa la versión de la
// API que fija el paquete `stripe` (la de sus tipos), sin sobrescribirla.
let client: Stripe | null = null;

export function getStripe(): Stripe {
  client ??= new Stripe(serverVar("STRIPE_SECRET_KEY"), { maxNetworkRetries: 2 });
  return client;
}

// Precio mensual de premium: lo fija el servidor, nunca el navegador (KTD8).
export const premiumPriceId = () => serverVar("STRIPE_PRICE_ID");

// Secreto de firma del webhook: sin él, el webhook falla cerrado.
export const webhookSecret = () => serverVar("STRIPE_WEBHOOK_SECRET");

// Precio para mostrarlo ("5,00 € al mes"). Si Stripe no responde, la pantalla se muestra sin él.
export async function premiumPriceLabel(): Promise<string | null> {
  try {
    const price = await getStripe().prices.retrieve(premiumPriceId());
    if (price.unit_amount === null) return null;
    const amount = new Intl.NumberFormat("es-ES", { style: "currency", currency: price.currency.toUpperCase() }).format(
      price.unit_amount / 100,
    );
    const interval = price.recurring?.interval === "year" ? "al año" : "al mes";
    return `${amount} ${interval}`;
  } catch {
    return null;
  }
}
