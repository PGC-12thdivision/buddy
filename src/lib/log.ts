import { z } from "zod";

// Registro seguro de errores (plan.md KTD17; guardarraíl 8). Escribe solo códigos: el de Postgres
// o PostgREST, los de las issues de zod o uno propio. Nunca `detail`, `message`, `hint`, valores
// de entrada ni mensajes crudos, que pueden llevar datos de salud.
// `where` es un código fijo del sitio que registra (p. ej. "guardar_limitaciones"); si no lo parece,
// también se descarta.

// Un código es un identificador corto: "23505", "PGRST116", "limite_mensual". Cualquier otra cosa
// se descarta por si lleva texto libre.
const CODE = /^[A-Za-z0-9_]{1,40}$/;

function errorCodes(error: unknown): string[] {
  if (error instanceof z.ZodError) return [...new Set(error.issues.map((issue) => issue.code))];
  if (typeof error === "object" && error !== null && "code" in error) {
    const { code } = error as { code: unknown };
    if (typeof code === "string" && CODE.test(code)) return [code];
  }
  return ["desconocido"];
}

export function formatSafeLog(where: string, error: unknown): string {
  return JSON.stringify({ donde: CODE.test(where) ? where : "desconocido", codigos: errorCodes(error) });
}

export function logError(where: string, error: unknown): void {
  console.error(formatSafeLog(where, error));
}
