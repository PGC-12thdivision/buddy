import { logError } from "@/lib/log";
import type { Delivery, Outcome } from "./send";
import type { Candidate } from "./store";
import { inactivityEmail } from "./templates";

// Aviso de inactividad (PRD sección 15; plan.md U10, KTD9): más de 14 días sin terminar una sesión.
// El periodo de inactividad se identifica por el día de la última actividad (la última sesión
// terminada o, si no hay ninguna, el registro). Mientras el usuario no vuelva a entrenar, el periodo
// no cambia y la restricción única de email_log impide un segundo email aunque el cron corra dos
// veces. Si vuelve a entrenar y lo deja otra vez, empieza un periodo nuevo.

export const INACTIVITY_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;

export function inactivityPeriod(input: { createdAt: string; lastSessionEndedAt: string | null; now: Date }): string | null {
  const since = Date.parse(input.lastSessionEndedAt ?? input.createdAt);
  if (!Number.isFinite(since)) return null;
  if (input.now.getTime() - since <= INACTIVITY_DAYS * DAY_MS) return null;
  return `desde-${new Date(since).toISOString().slice(0, 10)}`;
}

export type InactivitySummary = { revisados: number } & Record<Outcome, number>;

export type InactivityDeps = {
  users: () => Promise<Candidate[]>;
  lastSession: (userId: string) => Promise<string | null>;
  deliver: (delivery: Delivery) => Promise<Outcome>;
  appUrl: string;
  // Pausa entre envíos reales: Resend limita las peticiones por segundo.
  pause?: () => Promise<void>;
};

// Un fallo con un usuario no detiene al resto: cuenta como "failed" y se sigue.
export async function runInactivity(deps: InactivityDeps, now: Date): Promise<InactivitySummary> {
  const summary: InactivitySummary = { revisados: 0, sent: 0, failed: 0, duplicate: 0, skipped: 0 };
  const email = inactivityEmail(deps.appUrl);
  const cutoff = now.getTime() - INACTIVITY_DAYS * DAY_MS;
  // Solo pueden llevar más de 14 días inactivos quienes se registraron hace más de 14 días.
  const candidates = (await deps.users()).filter((user) => Date.parse(user.createdAt) < cutoff);

  for (const user of candidates) {
    summary.revisados++;
    try {
      const period = inactivityPeriod({ createdAt: user.createdAt, lastSessionEndedAt: await deps.lastSession(user.id), now });
      if (!period) continue;
      const outcome = await deps.deliver({ userId: user.id, kind: "inactividad", period, to: user.email, email });
      summary[outcome]++;
      if (outcome === "sent" || outcome === "failed") await deps.pause?.();
    } catch (error) {
      logError("cron_inactividad_usuario", error);
      summary.failed++;
    }
  }
  return summary;
}
