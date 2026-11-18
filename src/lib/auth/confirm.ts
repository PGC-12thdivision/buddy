// Parámetros de /auth/confirm (plan.md KTD4). Dos formas de enlace:
// - token_hash + type: plantilla propia (requiere SMTP propio para editarla).
// - code: plantilla por defecto de Supabase. Supabase ya ha confirmado el email antes de volver
//   aquí; el `code` solo abre la sesión, y únicamente en el navegador donde se hizo el registro.
// En los dos casos, `next` debe ser relativo y empezar por una única "/" (sin "//" ni "\").

export const CONFIRM_TYPES = ["email", "signup"] as const;
export type ConfirmType = (typeof CONFIRM_TYPES)[number];

const DEFAULT_NEXT = "/consentimiento";

// Caracteres de control: el parser de URL quita tabuladores y saltos de línea, así que
// "/\t/evil.com" acabaría siendo "//evil.com".
const CONTROL_CHARS = /[\u0000-\u001F\u007F]/;
const PROBE_ORIGIN = "http://buddy.invalid";

export function safeNext(next: string | null): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return DEFAULT_NEXT;
  if (next.includes("\\") || CONTROL_CHARS.test(next)) return DEFAULT_NEXT;
  // Rechaza también "//" codificado (p. ej. "/%2F%2Fevil.com").
  let decoded: string;
  try {
    decoded = decodeURIComponent(next);
  } catch {
    return DEFAULT_NEXT;
  }
  if (decoded.startsWith("//") || decoded.includes("\\") || CONTROL_CHARS.test(decoded)) return DEFAULT_NEXT;
  // Última barrera: resuelta contra un origen de prueba, tiene que quedarse en ese origen.
  const url = new URL(next, PROBE_ORIGIN);
  if (url.origin !== PROBE_ORIGIN) return DEFAULT_NEXT;
  return url.pathname + url.search + url.hash;
}

export type ConfirmParams =
  | { ok: true; kind: "token_hash"; tokenHash: string; type: ConfirmType; next: string }
  | { ok: true; kind: "code"; code: string; next: string }
  | { ok: false };

export function parseConfirmParams(params: URLSearchParams): ConfirmParams {
  // Supabase vuelve con error_code si el enlace no vale (caducado, ya usado).
  if (params.has("error") || params.has("error_code")) return { ok: false };
  const next = safeNext(params.get("next"));

  const code = params.get("code");
  if (code) return { ok: true, kind: "code", code, next };

  const tokenHash = params.get("token_hash");
  const type = params.get("type");
  if (!tokenHash || !CONFIRM_TYPES.includes(type as ConfirmType)) return { ok: false };
  return { ok: true, kind: "token_hash", tokenHash, type: type as ConfirmType, next };
}
