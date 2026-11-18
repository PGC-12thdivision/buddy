import { describe, expect, it } from "vitest";
import { nextScreenForAccount } from "./progress";

describe("a dónde va una cuenta al entrar", () => {
  it("sin consentimiento vigente, al consentimiento", () => {
    expect(nextScreenForAccount({ hasConsent: false, hasHealthProfile: false, hasActivePlan: false })).toBe("/consentimiento");
  });

  it("con consentimiento y sin cribado superado, a limitaciones", () => {
    expect(nextScreenForAccount({ hasConsent: true, hasHealthProfile: false, hasActivePlan: false })).toBe("/limitaciones");
  });

  it("con cribado superado y sin plan, al resumen", () => {
    expect(nextScreenForAccount({ hasConsent: true, hasHealthProfile: true, hasActivePlan: false })).toBe("/resumen");
  });

  it("con plan pero sin cribado vigente, a limitaciones antes que a Hoy", () => {
    expect(nextScreenForAccount({ hasConsent: true, hasHealthProfile: false, hasActivePlan: true })).toBe("/limitaciones");
  });

  it("con plan activo, a Hoy", () => {
    expect(nextScreenForAccount({ hasConsent: true, hasHealthProfile: true, hasActivePlan: true })).toBe("/hoy");
  });

  it("si retiró el consentimiento, vuelve al consentimiento aunque tuviera plan", () => {
    expect(nextScreenForAccount({ hasConsent: false, hasHealthProfile: false, hasActivePlan: true })).toBe("/consentimiento");
  });
});
