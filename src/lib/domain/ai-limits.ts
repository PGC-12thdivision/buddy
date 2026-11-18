// Límites de IA por función (plan.md, Key Decisions «Límites de IA por función»; KTD18; guardarraíl 12).
// - Gratis: plan inicial + 1 cambio de foco o días al mes.
// - Premium: 5 regeneraciones al mes (los cambios de foco o días cuentan como regeneración) y
//   1 check-in por semana.
// - Solo consume límite mensual o semanal una llamada con resultado `ok`, o una reserva pendiente
//   más reciente que `maxDuration`. Los intentos fallidos no lo consumen.
// - Tope técnico: 20 llamadas al día por usuario, contando cada intento (también fallos y
//   reservas pendientes caducadas).
// Mes, semana (lunes a domingo) y día son los del calendario de Madrid. La hora entra como parámetro.

export type AiCallKind = "plan_inicial" | "cambio_foco_dias" | "regenerar_plan" | "checkin";
export type AiCallOutcome = "pendiente" | "ok" | "validation_failed" | "connection" | "refused" | "empty";
export type AiCallRecord = { kind: AiCallKind; outcome: AiCallOutcome; createdAt: Date };

export type AiLimitInput = {
  kind: AiCallKind;
  premium: boolean;
  now: Date;
  // Llamadas del usuario: al menos las del mes en curso y la del plan inicial.
  calls: readonly AiCallRecord[];
  maxDurationMs: number;
};

export type AiLimitResult =
  | { allowed: true }
  | { allowed: false; reason: "solo_premium" | "tope_diario" | "limite_alcanzado" | "limite_mensual" | "limite_semanal" };

export const DAILY_CAP = 20;
export const FREE_PLAN_CHANGES_PER_MONTH = 1;
export const PREMIUM_REGENERATIONS_PER_MONTH = 5;
export const PREMIUM_CHECKINS_PER_WEEK = 1;

const madridDate = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Madrid",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

// "AAAA-MM-DD" en Madrid.
export const madridDayKey = (date: Date): string => madridDate.format(date);
export const madridMonthKey = (date: Date): string => madridDayKey(date).slice(0, 7);

// Lunes de la semana (en Madrid) como "AAAA-MM-DD".
export function madridWeekKey(date: Date): string {
  const [y, m, d] = madridDayKey(date).split("-").map(Number);
  const local = new Date(Date.UTC(y, m - 1, d));
  const daysSinceMonday = (local.getUTCDay() + 6) % 7;
  local.setUTCDate(local.getUTCDate() - daysSinceMonday);
  return local.toISOString().slice(0, 10);
}

const REGENERATION_KINDS: AiCallKind[] = ["cambio_foco_dias", "regenerar_plan"];

export function canStartAiCall(input: AiLimitInput): AiLimitResult {
  const { kind, premium, now, calls, maxDurationMs } = input;

  if (!premium && (kind === "regenerar_plan" || kind === "checkin")) return { allowed: false, reason: "solo_premium" };

  const today = madridDayKey(now);
  if (calls.filter((c) => madridDayKey(c.createdAt) === today).length >= DAILY_CAP) {
    return { allowed: false, reason: "tope_diario" };
  }

  const consumes = (c: AiCallRecord) =>
    c.outcome === "ok" || (c.outcome === "pendiente" && now.getTime() - c.createdAt.getTime() <= maxDurationMs);
  const consumed = calls.filter(consumes);

  if (kind === "plan_inicial") {
    return consumed.some((c) => c.kind === "plan_inicial") ? { allowed: false, reason: "limite_alcanzado" } : { allowed: true };
  }

  if (kind === "checkin") {
    const week = madridWeekKey(now);
    const used = consumed.filter((c) => c.kind === "checkin" && madridWeekKey(c.createdAt) === week).length;
    return used >= PREMIUM_CHECKINS_PER_WEEK ? { allowed: false, reason: "limite_semanal" } : { allowed: true };
  }

  const month = madridMonthKey(now);
  const used = consumed.filter((c) => REGENERATION_KINDS.includes(c.kind) && madridMonthKey(c.createdAt) === month).length;
  const limit = premium ? PREMIUM_REGENERATIONS_PER_MONTH : FREE_PLAN_CHANGES_PER_MONTH;
  return used >= limit ? { allowed: false, reason: "limite_mensual" } : { allowed: true };
}

const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

// "1 de diciembre": cuándo vuelve el cambio de foco o días del mes (diseño D26), en Madrid.
export function nextMonthStartText(now: Date): string {
  const month = Number(madridMonthKey(now).slice(5, 7));
  return `1 de ${MONTHS[month % 12]}`;
}

// Filas de ai_calls (tipo y resultado de la base de datos) con la forma de canStartAiCall. Para el
// límite de cambios solo importan el tipo "regenerar" y el total del día; el resto de tipos premium
// (estancamiento, semana…) cuentan solo para el tope diario.
const KIND_FROM_DB: Record<string, AiCallKind> = { plan: "plan_inicial", regenerar: "cambio_foco_dias", checkin: "checkin" };
const OUTCOME_FROM_DB: Record<string, AiCallOutcome> = {
  pending: "pendiente",
  ok: "ok",
  validation_failed: "validation_failed",
  connection: "connection",
  refused: "refused",
  empty: "empty",
};

export function aiCallRecords(rows: readonly { kind: string; outcome: string; created_at: string }[]): AiCallRecord[] {
  return rows.map((row) => ({
    kind: KIND_FROM_DB[row.kind] ?? "checkin",
    outcome: OUTCOME_FROM_DB[row.outcome] ?? "validation_failed",
    createdAt: new Date(row.created_at),
  }));
}
