import { describe, expect, it } from "vitest";
import { isPremium, trialEndsAt } from "./premium";

const registeredAt = new Date("2026-11-01T10:00:00Z");
const trialEnd = trialEndsAt(registeredAt);

describe("trialEndsAt", () => {
  it("la prueba dura 14 días desde el registro (D36)", () => {
    expect(trialEnd.toISOString()).toBe("2026-11-15T10:00:00.000Z");
  });
});

describe("isPremium", () => {
  it("dentro de los 14 días de prueba es premium", () => {
    expect(isPremium(new Date("2026-11-14T10:00:00Z"), trialEnd, null)).toBe(true);
  });

  it("el día 15 sin pago no es premium", () => {
    expect(isPremium(new Date("2026-11-15T10:00:00Z"), trialEnd, null)).toBe(false);
    expect(isPremium(new Date("2026-11-16T10:00:00Z"), trialEnd, "canceled")).toBe(false);
  });

  it("con suscripción «active» o «trialing» es premium aunque la prueba haya terminado", () => {
    const after = new Date("2026-12-20T10:00:00Z");
    expect(isPremium(after, trialEnd, "active")).toBe(true);
    expect(isPremium(after, trialEnd, "trialing")).toBe(true);
  });

  it("otros estados de Stripe no cuentan como premium (KTD8)", () => {
    const after = new Date("2026-12-20T10:00:00Z");
    expect(isPremium(after, trialEnd, "past_due")).toBe(false);
    expect(isPremium(after, null, "incomplete")).toBe(false);
  });
});
