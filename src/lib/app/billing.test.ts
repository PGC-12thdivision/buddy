import type Stripe from "stripe";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({}) }));

const { cancelOpenSubscriptions, scheduledCancelDate } = await import("./billing");

function fakeStripe(statuses: string[]) {
  const cancel = vi.fn(async () => ({}));
  const stripe = {
    subscriptions: {
      list: vi.fn(async () => ({ data: statuses.map((status, i) => ({ id: `sub_${i}`, status })) })),
      cancel,
    },
  } as unknown as Stripe;
  return { stripe, cancel };
}

describe("cancelOpenSubscriptions (borrar la cuenta)", () => {
  it("cancela solo las suscripciones que aún pueden cobrar", async () => {
    const { stripe, cancel } = fakeStripe(["active", "canceled", "trialing", "incomplete_expired", "past_due"]);
    expect(await cancelOpenSubscriptions(stripe, "cus_1")).toBe(3);
    expect(cancel.mock.calls.map((c) => (c as unknown[])[0])).toEqual(["sub_0", "sub_2", "sub_4"]);
  });

  it("sin suscripciones abiertas no cancela nada", async () => {
    const { stripe, cancel } = fakeStripe(["canceled"]);
    expect(await cancelOpenSubscriptions(stripe, "cus_1")).toBe(0);
    expect(cancel).not.toHaveBeenCalled();
  });
});

function stripeWith(subs: object[] | Error) {
  return {
    subscriptions: {
      list: vi.fn(async () => {
        if (subs instanceof Error) throw subs;
        return { data: subs };
      }),
    },
  } as unknown as Stripe;
}

describe("scheduledCancelDate (Ajustes: premium hasta…)", () => {
  const dec20 = Date.UTC(2026, 11, 20) / 1000;

  it("devuelve cancel_at de la suscripción activa cancelada desde el portal", async () => {
    const stripe = stripeWith([{ status: "active", cancel_at: dec20, cancel_at_period_end: false, items: { data: [] } }]);
    expect((await scheduledCancelDate(stripe, "cus_1"))?.getTime()).toBe(dec20 * 1000);
  });

  it("con cancel_at_period_end usa el fin del periodo", async () => {
    const stripe = stripeWith([
      { status: "active", cancel_at: null, cancel_at_period_end: true, items: { data: [{ current_period_end: dec20 }] } },
    ]);
    expect((await scheduledCancelDate(stripe, "cus_1"))?.getTime()).toBe(dec20 * 1000);
  });

  it("sin baja programada, o con la suscripción ya cancelada, devuelve null", async () => {
    expect(
      await scheduledCancelDate(stripeWith([{ status: "active", cancel_at: null, cancel_at_period_end: false, items: { data: [] } }]), "cus_1"),
    ).toBeNull();
    expect(await scheduledCancelDate(stripeWith([{ status: "canceled", cancel_at: dec20, items: { data: [] } }]), "cus_1")).toBeNull();
  });

  it("si Stripe falla, devuelve null y la pantalla sigue", async () => {
    expect(await scheduledCancelDate(stripeWith(new Error("caído")), "cus_1")).toBeNull();
  });
});