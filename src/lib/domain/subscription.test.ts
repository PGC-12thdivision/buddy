import { describe, expect, it } from "vitest";
import { isPayingStatus } from "./premium";
import { currentSubscription, returnPollState, safeReturnPath, toSubscriptionStatus } from "./subscription";

describe("isPayingStatus", () => {
  it("solo active y trialing pagan (KTD8)", () => {
    expect(isPayingStatus("active")).toBe(true);
    expect(isPayingStatus("trialing")).toBe(true);
    for (const s of ["none", "past_due", "canceled", "incomplete", "unpaid", "paused", null, undefined]) {
      expect(isPayingStatus(s)).toBe(false);
    }
  });
});

describe("currentSubscription", () => {
  it("sin suscripciones, none", () => {
    expect(currentSubscription([])).toEqual({ subscriptionId: null, status: "none" });
  });

  it("manda la que paga aunque haya una cancelada más reciente", () => {
    expect(
      currentSubscription([
        { id: "sub_activa", status: "active", created: 100 },
        { id: "sub_cancelada", status: "canceled", created: 200 },
      ]),
    ).toEqual({ subscriptionId: "sub_activa", status: "active" });
  });

  it("sin ninguna que pague, la más reciente", () => {
    expect(
      currentSubscription([
        { id: "sub_vieja", status: "canceled", created: 100 },
        { id: "sub_nueva", status: "past_due", created: 200 },
      ]),
    ).toEqual({ subscriptionId: "sub_nueva", status: "past_due" });
  });

  it("un estado desconocido se guarda como none (falla cerrado)", () => {
    expect(toSubscriptionStatus("estado_nuevo_de_stripe")).toBe("none");
    expect(currentSubscription([{ id: "s", status: "estado_nuevo_de_stripe", created: 1 }]).status).toBe("none");
  });
});

describe("safeReturnPath", () => {
  it("acepta solo pantallas de la lista cerrada", () => {
    expect(safeReturnPath("/ajustes")).toBe("/ajustes");
    expect(safeReturnPath("https://malicioso.example")).toBe("/hoy");
    expect(safeReturnPath("//malicioso.example")).toBe("/hoy");
    expect(safeReturnPath(undefined)).toBe("/hoy");
    expect(safeReturnPath(["/plan"])).toBe("/hoy");
  });
});

describe("returnPollState", () => {
  it("premium activado solo con un estado que paga", () => {
    expect(returnPollState("active")).toBe("hecho");
    expect(returnPollState("trialing")).toBe("hecho");
  });

  it("un primer pago que no ha salido es fallido", () => {
    expect(returnPollState("incomplete")).toBe("fallido");
    expect(returnPollState("incomplete_expired")).toBe("fallido");
  });

  it("cualquier otro estado sigue esperando al webhook", () => {
    expect(returnPollState("none")).toBe("esperando");
    expect(returnPollState("canceled")).toBe("esperando");
    expect(returnPollState(null)).toBe("esperando");
  });
});
