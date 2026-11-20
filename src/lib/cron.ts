import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";

// Autorización de los crons (plan.md KTD9). Vercel envía `Authorization: Bearer <CRON_SECRET>`.
// Se compara en tiempo constante (sobre los resúmenes SHA-256, que siempre miden lo mismo) y, si
// CRON_SECRET no está configurada, se rechaza todo: falla cerrado.
const digest = (value: string) => createHash("sha256").update(value).digest();

export function isAuthorizedCron(authorization: string | null, secret: string | undefined): boolean {
  if (!secret) return false;
  return timingSafeEqual(digest(authorization ?? ""), digest(`Bearer ${secret}`));
}
