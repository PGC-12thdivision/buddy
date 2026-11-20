import "server-only";
import { redirect } from "next/navigation";
import { isPayingStatus, isPremium } from "@/lib/domain/premium";
import { createClient } from "@/lib/supabase/server";
import { accountProgress, sessionUserId } from "@/lib/wizard/account";
import { nextScreenForAccount } from "@/lib/wizard/progress";
import { loadActivePlan } from "./active-plan";

// Contexto de las pantallas de la app (Hoy, Plan, Progreso, Ajustes). Comprobación de página: sin
// sesión, a entrar; sin consentimiento, cribado o plan, a la pantalla del wizard que toca.

const DAY_MS = 24 * 60 * 60 * 1000;

export async function requireAppContext() {
  const supabase = await createClient();
  const userId = await sessionUserId(supabase);
  if (!userId) redirect("/entrar");
  const progress = await accountProgress(supabase, userId);
  if (!progress.hasConsent || !progress.hasHealthProfile) redirect(nextScreenForAccount(progress));

  const [plan, account, sessions] = await Promise.all([
    loadActivePlan(supabase, userId),
    supabase.from("account_status").select("trial_ends_at, subscription_status, stripe_customer_id").eq("user_id", userId).maybeSingle(),
    supabase.from("workout_sessions").select("id", { count: "exact", head: true }).eq("user_id", userId).not("ended_at", "is", null),
  ]);
  if (!plan) redirect("/resumen");

  const now = new Date();
  const trialEnd = account.data ? new Date(account.data.trial_ends_at) : null;
  const subscription = account.data?.subscription_status ?? null;
  const premium = isPremium(now, trialEnd, subscription);
  const paying = isPayingStatus(subscription);
  const hasStripeCustomer = Boolean(account.data?.stripe_customer_id);
  const trialDaysLeft = !paying && trialEnd ? Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / DAY_MS)) : null;

  return { supabase, userId, plan, premium, paying, hasStripeCustomer, trialDaysLeft, completedSessions: sessions.count ?? 0 };
}

export const FOCUS_TEXT: Record<string, string> = {
  equilibrado: "Foco equilibrado",
  fuerza: "Foco en fuerza",
  musculo: "Foco en músculo",
  grasa: "Foco en perder grasa",
};

// Título con datos (diseño D17): "3 DÍAS, CUERPO COMPLETO".
export const planTitle = (days: number, template: string) =>
  `${days} días, ${template === "cuerpo_completo" ? "cuerpo completo" : "torso y pierna"}`;
