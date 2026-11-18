import { describe, expect, it } from "vitest";
import { aiCallRecords, canStartAiCall, nextMonthStartText, type AiCallRecord } from "./ai-limits";

const MAX_DURATION_MS = 60_000;
const now = new Date("2026-11-12T12:00:00Z");
const earlierThisMonth = new Date("2026-11-03T09:00:00Z");
const lastMonth = new Date("2026-10-20T09:00:00Z");

const call = (
  kind: AiCallRecord["kind"],
  outcome: AiCallRecord["outcome"],
  createdAt: Date = earlierThisMonth,
): AiCallRecord => ({ kind, outcome, createdAt });

const check = (kind: AiCallRecord["kind"], premium: boolean, calls: AiCallRecord[], at: Date = now) =>
  canStartAiCall({ kind, premium, now: at, calls, maxDurationMs: MAX_DURATION_MS });

describe("canStartAiCall: gratis", () => {
  it("puede generar el plan inicial una vez", () => {
    expect(check("plan_inicial", false, [])).toEqual({ allowed: true });
    expect(check("plan_inicial", false, [call("plan_inicial", "ok")])).toEqual({
      allowed: false,
      reason: "limite_alcanzado",
    });
  });

  it("tiene 1 cambio de foco o días al mes; con el del mes usado no puede, y el mes siguiente sí", () => {
    expect(check("cambio_foco_dias", false, [call("cambio_foco_dias", "ok", lastMonth)])).toEqual({ allowed: true });
    expect(check("cambio_foco_dias", false, [call("cambio_foco_dias", "ok")])).toEqual({
      allowed: false,
      reason: "limite_mensual",
    });
  });

  it("el mes es el del calendario en Madrid: el 30/11 a las 23:30 UTC ya es diciembre", () => {
    const novemberChange = call("cambio_foco_dias", "ok", new Date("2026-11-30T12:00:00Z"));
    expect(check("cambio_foco_dias", false, [novemberChange], new Date("2026-11-30T23:30:00Z"))).toEqual({
      allowed: true,
    });
  });

  it("no puede regenerar sin cambio ni hacer el check-in", () => {
    expect(check("regenerar_plan", false, [])).toEqual({ allowed: false, reason: "solo_premium" });
    expect(check("checkin", false, [])).toEqual({ allowed: false, reason: "solo_premium" });
  });
});

describe("canStartAiCall: premium", () => {
  it("con 5 regeneraciones en el mes no puede regenerar; con 4 sí", () => {
    const four = Array.from({ length: 4 }, () => call("regenerar_plan", "ok"));
    expect(check("regenerar_plan", true, four)).toEqual({ allowed: true });
    expect(check("regenerar_plan", true, [...four, call("cambio_foco_dias", "ok")])).toEqual({
      allowed: false,
      reason: "limite_mensual",
    });
  });

  it("1 check-in por semana (lunes a domingo)", () => {
    const monday = new Date("2026-11-09T08:00:00Z");
    expect(check("checkin", true, [call("checkin", "ok", monday)])).toEqual({
      allowed: false,
      reason: "limite_semanal",
    });
    const previousSunday = new Date("2026-11-08T20:00:00Z");
    expect(check("checkin", true, [call("checkin", "ok", previousSunday)])).toEqual({ allowed: true });
  });
});

describe("canStartAiCall: intentos y tope diario", () => {
  it("un intento fallido por validación no consume el límite mensual ni el semanal", () => {
    expect(check("cambio_foco_dias", false, [call("cambio_foco_dias", "validation_failed")])).toEqual({
      allowed: true,
    });
    expect(check("checkin", true, [call("checkin", "validation_failed", new Date("2026-11-10T08:00:00Z"))])).toEqual({
      allowed: true,
    });
  });

  it("una reserva pendiente reciente ocupa el límite (dos peticiones en paralelo)", () => {
    const pending = call("cambio_foco_dias", "pendiente", new Date(now.getTime() - 10_000));
    expect(check("cambio_foco_dias", false, [pending])).toEqual({ allowed: false, reason: "limite_mensual" });
  });

  it("una reserva pendiente más antigua que maxDuration se libera para el mes, pero cuenta en el día", () => {
    const stale = call("cambio_foco_dias", "pendiente", new Date(now.getTime() - MAX_DURATION_MS - 1));
    expect(check("cambio_foco_dias", false, [stale])).toEqual({ allowed: true });

    const today = (outcome: AiCallRecord["outcome"]) => call("regenerar_plan", outcome, new Date("2026-11-12T08:00:00Z"));
    const nineteenFailedPlusStale = [...Array.from({ length: 19 }, () => today("validation_failed")), stale];
    expect(check("cambio_foco_dias", true, nineteenFailedPlusStale)).toEqual({ allowed: false, reason: "tope_diario" });
  });

  it("la llamada 21 del día se rechaza, contando cada intento; la 20 se permite", () => {
    const today = new Date("2026-11-12T07:00:00Z");
    const nineteen = Array.from({ length: 19 }, () => call("regenerar_plan", "validation_failed", today));
    expect(check("regenerar_plan", true, nineteen)).toEqual({ allowed: true });
    expect(check("regenerar_plan", true, [...nineteen, call("regenerar_plan", "connection", today)])).toEqual({
      allowed: false,
      reason: "tope_diario",
    });
  });
});

describe("nextMonthStartText (diseño D26)", () => {
  it("anuncia el día 1 del mes siguiente en Madrid", () => {
    expect(nextMonthStartText(now)).toBe("1 de diciembre");
    expect(nextMonthStartText(new Date("2026-12-15T12:00:00Z"))).toBe("1 de enero");
  });

  it("usa el mes de Madrid, no el de UTC", () => {
    // 31/10 a las 23:30 UTC ya es 1/11 en Madrid.
    expect(nextMonthStartText(new Date("2026-10-31T23:30:00Z"))).toBe("1 de diciembre");
  });
});

describe("aiCallRecords", () => {
  it("traduce las filas de ai_calls y un segundo cambio en el mes siendo gratis se rechaza", () => {
    const records = aiCallRecords([
      { kind: "plan", outcome: "ok", created_at: "2026-11-01T10:00:00Z" },
      { kind: "regenerar", outcome: "ok", created_at: "2026-11-05T10:00:00Z" },
      { kind: "estancamiento", outcome: "pending", created_at: "2026-11-05T10:00:00Z" },
    ]);
    expect(records.map((r) => [r.kind, r.outcome])).toEqual([
      ["plan_inicial", "ok"],
      ["cambio_foco_dias", "ok"],
      ["checkin", "pendiente"],
    ]);
    expect(check("cambio_foco_dias", false, records)).toEqual({ allowed: false, reason: "limite_mensual" });
    expect(check("cambio_foco_dias", true, records)).toEqual({ allowed: true });
  });
});
