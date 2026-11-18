import "server-only";
import { logError } from "@/lib/log";
import { requireServerVar } from "@/lib/env";
import type { RenderedEmail } from "./templates";

// Envío de emails con Resend (plan.md U10; KTD9, KTD17).
// - Se llama a la API REST con fetch, sin el SDK: es un único endpoint, no añade dependencia y en
//   los tests basta con sustituir fetch.
// - Cada email es único por (usuario, tipo, periodo) gracias a `email_log` (restricción única) y,
//   además, a la cabecera Idempotency-Key de Resend, que cubre dos envíos simultáneos.
// - Nunca se registra la dirección, el cuerpo ni la respuesta de Resend: solo códigos fijos.
// - D7: sin dominio propio Resend solo entrega a la dirección de la cuenta. Fuera de producción solo
//   se envía a las direcciones de EMAIL_ALLOWLIST; sin ella, no se envía nada ("skipped").

export const RESEND_URL = "https://api.resend.com/emails";
// Remitente de pruebas de Resend, el único válido sin dominio verificado.
export const DEFAULT_FROM = "BUDDY <onboarding@resend.dev>";
const TIMEOUT_MS = 10_000;

export type EmailKind = "bienvenida" | "compra" | "inactividad";
export type Outcome = "sent" | "failed" | "duplicate" | "skipped";

type Source = Record<string, string | undefined>;

export type EmailConfig = {
  apiKey: string;
  from: string;
  // null: sin lista (en producción se envía a todos; fuera, a nadie).
  allowlist: ReadonlySet<string> | null;
  production: boolean;
  appUrl: string;
};

const withHttps = (host: string) => (host.startsWith("http") ? host : `https://${host}`);

// URL base de los enlaces: APP_URL si está; si no, la que da Vercel para cada entorno.
export function appUrlFrom(source: Source): string {
  const production = source.VERCEL_ENV === "production";
  const host =
    source.APP_URL ||
    (production ? source.VERCEL_PROJECT_PRODUCTION_URL : source.VERCEL_BRANCH_URL) ||
    source.VERCEL_URL;
  return host ? withHttps(host).replace(/\/+$/, "") : "http://localhost:3000";
}

// Lanza si falta RESEND_API_KEY (falla cerrado; el mensaje nombra la variable, nunca su valor).
export function emailConfig(source: Source): EmailConfig {
  const list = (source.EMAIL_ALLOWLIST ?? "")
    .split(",")
    .map((address) => address.trim().toLowerCase())
    .filter(Boolean);
  return {
    apiKey: requireServerVar(source, "RESEND_API_KEY"),
    from: source.EMAIL_FROM?.trim() || DEFAULT_FROM,
    allowlist: list.length > 0 ? new Set(list) : null,
    production: source.VERCEL_ENV === "production",
    appUrl: appUrlFrom(source),
  };
}

// Con lista, solo sus direcciones (también en producción, si se quiere evitar filas "failed" por D7).
// Sin lista: en producción, todas; fuera de producción, ninguna.
export function recipientAllowed(config: EmailConfig, to: string): boolean {
  if (config.allowlist) return config.allowlist.has(to.trim().toLowerCase());
  return config.production;
}

export type Message = RenderedEmail & { to: string; idempotencyKey: string };
export type SendResult = { ok: true } | { ok: false; code: string };

export async function sendEmail(config: EmailConfig, message: Message, fetchImpl: typeof fetch = fetch): Promise<SendResult> {
  try {
    const response = await fetchImpl(RESEND_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": message.idempotencyKey,
      },
      body: JSON.stringify({
        from: config.from,
        to: [message.to],
        subject: message.subject,
        html: message.html,
        text: message.text,
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    // El cuerpo de error de Resend puede repetir la dirección: no se lee. Solo el estado HTTP.
    if (!response.ok) return { ok: false, code: `resend_${response.status}` };
    return { ok: true };
  } catch (error) {
    const name = (error as { name?: unknown } | null)?.name;
    return { ok: false, code: name === "TimeoutError" || name === "AbortError" ? "resend_timeout" : "resend_red" };
  }
}

// Registro de envíos (tabla email_log). Una implementación con Supabase vive en ./store.ts.
export type LogStatus = "sent" | "failed";
export type EmailLogStore = {
  status(userId: string, kind: EmailKind, period: string): Promise<LogStatus | null>;
  record(row: { userId: string; kind: EmailKind; period: string; status: LogStatus; errorCode: string | null }): Promise<void>;
};

export type Delivery = { userId: string; kind: EmailKind; period: string; to: string; email: RenderedEmail };
export type DeliverDeps = { config: EmailConfig; store: EmailLogStore; fetchImpl?: typeof fetch };

// Envía una sola vez por (usuario, tipo, periodo). Un envío "failed" se reintenta en la siguiente
// llamada (el cron del día siguiente, otro reintento del webhook); uno "sent" nunca se repite.
// No lanza: devuelve el resultado.
export async function deliverOnce({ config, store, fetchImpl }: DeliverDeps, delivery: Delivery): Promise<Outcome> {
  const { userId, kind, period } = delivery;
  let previous: LogStatus | null;
  try {
    previous = await store.status(userId, kind, period);
  } catch (error) {
    // Sin poder comprobar el registro no se envía: mejor ningún email que dos.
    logError(`email_${kind}_leer_registro`, error);
    return "failed";
  }
  if (previous === "sent") return "duplicate";

  if (!recipientAllowed(config, delivery.to)) {
    logError(`email_${kind}`, { code: "skipped_no_permitido" });
    return "skipped";
  }

  const result = await sendEmail(
    config,
    { ...delivery.email, to: delivery.to, idempotencyKey: `${kind}/${userId}/${period}` },
    fetchImpl,
  );
  if (!result.ok) logError(`email_${kind}`, { code: result.code });

  try {
    await store.record({
      userId,
      kind,
      period,
      status: result.ok ? "sent" : "failed",
      errorCode: result.ok ? null : result.code,
    });
  } catch (error) {
    logError(`email_${kind}_guardar_registro`, error);
  }
  return result.ok ? "sent" : "failed";
}
