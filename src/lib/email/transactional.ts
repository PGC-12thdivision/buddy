import "server-only";
import { after } from "next/server";
import { logError } from "@/lib/log";
import { createAdminClient } from "@/lib/supabase/admin";
import { deliverOnce, emailConfig, type EmailKind, type Outcome } from "./send";
import { confirmedEmail, emailLogStore } from "./store";
import { purchaseEmail, welcomeEmail, type RenderedEmail } from "./templates";

// Emails de bienvenida y de confirmación de compra. Ninguno lanza: un email que no sale nunca
// rompe el registro ni el webhook. Idempotentes por email_log.

async function sendTo(userId: string, kind: EmailKind, period: string, render: (appUrl: string) => RenderedEmail): Promise<Outcome> {
  try {
    const config = emailConfig(process.env);
    const admin = createAdminClient();
    const to = await confirmedEmail(admin, userId);
    if (!to) return "skipped";
    return await deliverOnce({ config, store: emailLogStore(admin) }, { userId, kind, period, to, email: render(config.appUrl) });
  } catch (error) {
    logError(`email_${kind}`, error);
    return "failed";
  }
}

// Bienvenida: una sola vez por usuario, cuando su email ya está confirmado.
export function sendWelcome(userId: string): Promise<Outcome> {
  return sendTo(userId, "bienvenida", "unico", welcomeEmail);
}

// Para /auth/confirm y para entrar: se envía después de responder, sin retrasar la redirección.
export function scheduleWelcome(userId: string): void {
  after(() => sendWelcome(userId).then(() => undefined));
}

// Confirmación de compra (U9). Punto de llamada: el webhook de Stripe, al procesar
// `checkout.session.completed` de un usuario ya identificado (su user_id sale de la fila de
// account_status, nunca del cuerpo del evento sin verificar):
//
//   import { sendPurchaseConfirmation } from "@/lib/email/transactional";
//   await sendPurchaseConfirmation(userId, session.subscription ?? session.id);
//
// `purchaseRef` identifica la compra (id de la suscripción o del checkout): con el mismo valor el
// email no se repite aunque Stripe reintente el evento; una compra nueva tras cancelar sí lo recibe.
export function sendPurchaseConfirmation(userId: string, purchaseRef = "unico"): Promise<Outcome> {
  return sendTo(userId, "compra", purchaseRef, purchaseEmail);
}
