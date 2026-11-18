// Parámetros de /auth/confirm (plan.md KTD4). Solo se aceptan los `type` de la confirmación de
// registro y un `next` relativo que empiece por una única "/" (sin "//" ni "\"), para que el
// enlace no pueda redirigir fuera del sitio.

export const CONFIRM_TYPES = ["email", "signup"] as const;
export type ConfirmType = (typeof CONFIRM_TYPES)[number];

const DEFAULT_NEXT = "/consentimiento";

export function safeNext(next: string | null): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return DEFAULT_NEXT;
  if (next.includes("\\")) return DEFAULT_NEXT;
  // Rechaza también "//" codificado (p. ej. "/%2F%2Fevil.com").
  let decoded: string;
  try {
    decoded = decodeURIComponent(next);
  } catch {
    return DEFAULT_NEXT;
  }
  if (decoded.startsWith("//") || decoded.includes("\\")) return DEFAULT_NEXT;
  return next;
}

export type ConfirmParams = { ok: true; tokenHash: string; type: ConfirmType; next: string } | { ok: false };

export function parseConfirmParams(params: URLSearchParams): ConfirmParams {
  const tokenHash = params.get("token_hash");
  const type = params.get("type");
  if (!tokenHash || !CONFIRM_TYPES.includes(type as ConfirmType)) return { ok: false };
  return { ok: true, tokenHash, type: type as ConfirmType, next: safeNext(params.get("next")) };
}
