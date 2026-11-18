import { isPayingStatus } from "./premium";

// Reglas puras de la suscripción de Stripe (plan.md U9, KTD8). Sin red: las prueba Vitest.

// Valores que admite `account_status.subscription_status` (restricción de la migración inicial).
const KNOWN_STATUSES = [
  "none",
  "trialing",
  "active",
  "past_due",
  "canceled",
  "incomplete",
  "incomplete_expired",
  "unpaid",
  "paused",
] as const;
export type SubscriptionStatus = (typeof KNOWN_STATUSES)[number];

// Un estado que no conocemos se guarda como "none": falla cerrado (no da premium).
export const toSubscriptionStatus = (status: string): SubscriptionStatus =>
  (KNOWN_STATUSES as readonly string[]).includes(status) ? (status as SubscriptionStatus) : "none";

export type StripeSubscriptionLike = { id: string; status: string; created: number };

// Estado actual del cliente a partir de sus suscripciones, tal como las devuelve Stripe al
// consultarlas (los eventos llegan desordenados, así que nunca se usa el estado del evento). Manda
// una suscripción que paga; si no hay, la más reciente; sin ninguna, "none".
export function currentSubscription(subscriptions: StripeSubscriptionLike[]): {
  subscriptionId: string | null;
  status: SubscriptionStatus;
} {
  const byNewest = [...subscriptions].sort((a, b) => b.created - a.created);
  const chosen = byNewest.find((s) => isPayingStatus(s.status)) ?? byNewest[0];
  if (!chosen) return { subscriptionId: null, status: "none" };
  return { subscriptionId: chosen.id, status: toSubscriptionStatus(chosen.status) };
}

// Pantallas a las que se puede volver tras el pago (diseño D11). Lista cerrada: el valor llega del
// navegador y solo decide a dónde se navega, nunca si se activa premium.
const RETURN_PATHS = ["/hoy", "/plan", "/progreso", "/ajustes", "/premium"] as const;
export type ReturnPath = (typeof RETURN_PATHS)[number];

export const safeReturnPath = (value: unknown): ReturnPath =>
  typeof value === "string" && (RETURN_PATHS as readonly string[]).includes(value) ? (value as ReturnPath) : "/hoy";

// Estado que ve la pantalla de vuelta mientras consulta `account_status` (diseño D11).
export type ReturnPollState = "esperando" | "hecho" | "fallido";

// "fallido" solo con estados que deja un primer pago que no ha salido; cualquier otro (también un
// "canceled" antiguo) sigue esperando al webhook hasta agotar el tiempo.
export function returnPollState(subscriptionStatus: string | null): ReturnPollState {
  if (isPayingStatus(subscriptionStatus)) return "hecho";
  if (subscriptionStatus === "incomplete" || subscriptionStatus === "incomplete_expired") return "fallido";
  return "esperando";
}
