// «Es premium» (PRD §14; D36; KTD8): una única función con dos entradas, el reloj de la prueba y
// `subscription_status`, que actualiza el webhook de Stripe. La hora entra como parámetro.

export const TRIAL_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;

// Solo estos estados de Stripe cuentan como premium (KTD8).
const PREMIUM_STATUSES = ["active", "trialing"];

// La suscripción de Stripe está al día (paga). No incluye la prueba de la app.
export const isPayingStatus = (subscriptionStatus: string | null | undefined): boolean =>
  typeof subscriptionStatus === "string" && PREMIUM_STATUSES.includes(subscriptionStatus);

export const trialEndsAt = (registeredAt: Date): Date => new Date(registeredAt.getTime() + TRIAL_DAYS * DAY_MS);

export function isPremium(now: Date, trialEnd: Date | null, subscriptionStatus: string | null): boolean {
  if (isPayingStatus(subscriptionStatus)) return true;
  return trialEnd !== null && now.getTime() < trialEnd.getTime();
}
