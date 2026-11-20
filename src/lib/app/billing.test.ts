import type Stripe from "stripe";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({}) }));

const { cancelOpenSubscriptions } = await import("./billing");

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
