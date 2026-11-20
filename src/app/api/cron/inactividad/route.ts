import { NextResponse, type NextRequest } from "next/server";
import { isAuthorizedCron } from "@/lib/cron";
import { runInactivity } from "@/lib/email/inactivity";
import { deliverOnce, emailConfig, type EmailConfig } from "@/lib/email/send";
import { confirmedUsers, emailLogStore, lastFinishedSession } from "@/lib/email/store";
import { logError } from "@/lib/log";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/cron/inactividad (plan.md U10, KTD9). Vercel Cron la llama a diario a las 8:00 UTC, solo
// en producción (vercel.json). En staging se lanza a mano con CRON_SECRET y el bypass de Vercel.
// Fuera del proxy (src/proxy.ts): no lleva sesión. La respuesta solo lleva contadores, nunca emails.

export const maxDuration = 60;

// Resend admite pocas peticiones por segundo: una pausa corta entre envíos.
const PAUSE_MS = 600;
const pause = () => new Promise<void>((resolve) => setTimeout(resolve, PAUSE_MS));

export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request.headers.get("authorization"), process.env.CRON_SECRET)) {
    if (!process.env.CRON_SECRET) logError("cron_inactividad", { code: "sin_cron_secret" });
    return NextResponse.json({ status: "no_autorizado" }, { status: 401 });
  }

  let config: EmailConfig;
  try {
    config = emailConfig(process.env);
  } catch {
    logError("cron_inactividad", { code: "sin_resend_api_key" });
    return NextResponse.json({ status: "sin_configurar" }, { status: 500 });
  }

  try {
    const admin = createAdminClient();
    const store = emailLogStore(admin);
    const summary = await runInactivity(
      {
        users: () => confirmedUsers(admin),
        lastSession: (userId) => lastFinishedSession(admin, userId),
        deliver: (delivery) => deliverOnce({ config, store }, delivery),
        appUrl: config.appUrl,
        pause,
      },
      new Date(),
    );
    return NextResponse.json({ status: "ok", ...summary });
  } catch (error) {
    logError("cron_inactividad", error);
    return NextResponse.json({ status: "fallo" }, { status: 500 });
  }
}
