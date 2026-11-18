import Stripe from "stripe";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Webhook de Stripe (plan.md U9): firma real generada con el ayudante de pruebas de Stripe, API de
// Stripe y base de datos falsas. La base falsa reproduce apply_stripe_event: evento y estado en una
// sola transacción, duplicados ignorados y clientes desconocidos sin guardar nada.

const SECRET = "whsec_test_secreto_de_prueba";
const realStripe = new Stripe("sk_test_falsa_para_tests");

type Account = { user_id: string; stripe_customer_id: string | null; subscription_status: string; stripe_subscription_id: string | null };
let accounts: Account[];
let storedEvents: Set<string>;
let rpcFails: boolean;
let secretMissing: boolean;
const list = vi.fn();

vi.mock("@/lib/stripe", () => ({
  getStripe: () => ({ webhooks: realStripe.webhooks, subscriptions: { list: (...args: unknown[]) => list(...args) } }),
  webhookSecret: () => {
    if (secretMissing) throw new Error("Variable de entorno ausente: STRIPE_WEBHOOK_SECRET");
    return SECRET;
  },
}));

function select(table: string) {
  let column = "";
  let value: unknown;
  const builder = {
    select: () => builder,
    eq: (c: string, v: unknown) => {
      column = c;
      value = v;
      return builder;
    },
    maybeSingle: async () => {
      if (table === "account_status") {
        const row = accounts.find((a) => (a as Record<string, unknown>)[column] === value);
        return { data: row ? { user_id: row.user_id } : null, error: null };
      }
      return { data: storedEvents.has(value as string) ? { event_id: value } : null, error: null };
    },
  };
  return builder;
}

const rpc = vi.fn(async (name: string, args: Record<string, string | null>) => {
  expect(name).toBe("apply_stripe_event");
  if (rpcFails) return { data: null, error: { code: "XX000" } };
  const account = accounts.find((a) => a.stripe_customer_id === args.p_customer_id);
  if (!account) return { data: "cliente_desconocido", error: null };
  if (storedEvents.has(args.p_event_id as string)) return { data: "duplicado", error: null };
  storedEvents.add(args.p_event_id as string);
  account.subscription_status = args.p_status as string;
  account.stripe_subscription_id = args.p_subscription_id;
  return { data: "aplicado", error: null };
});

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: (table: string) => select(table), rpc }),
}));

const { POST } = await import("./route");

function event(id: string, type: string, object: Record<string, unknown>, created = 1_800_000_000) {
  return JSON.stringify({ id, object: "event", type, created, api_version: "2026-10-28.endive", data: { object } });
}

function signedRequest(payload: string, secret = SECRET) {
  const signature = realStripe.webhooks.generateTestHeaderString({ payload, secret });
  return new Request("http://localhost/api/stripe/webhook", {
    method: "POST",
    headers: { "stripe-signature": signature, "content-type": "application/json" },
    body: payload,
  });
}

const sub = (id: string, status: string, created: number) => ({ id, object: "subscription", status, created, customer: "cus_A" });

beforeEach(() => {
  accounts = [{ user_id: "user-a", stripe_customer_id: "cus_A", subscription_status: "none", stripe_subscription_id: null }];
  storedEvents = new Set();
  rpcFails = false;
  secretMissing = false;
  list.mockReset();
  rpc.mockClear();
});

describe("POST /api/stripe/webhook", () => {
  it("con firma válida, escribe el estado que devuelve Stripe al consultar", async () => {
    list.mockResolvedValue({ data: [sub("sub_1", "active", 100)] });
    const response = await POST(signedRequest(event("evt_1", "customer.subscription.created", sub("sub_1", "incomplete", 100))));
    expect(response.status).toBe(200);
    expect(list).toHaveBeenCalledWith({ customer: "cus_A", status: "all", limit: 20 });
    expect(accounts[0]).toMatchObject({ subscription_status: "active", stripe_subscription_id: "sub_1" });
    expect(storedEvents.has("evt_1")).toBe(true);
  });

  it("checkout.session.completed también activa premium con el estado consultado", async () => {
    list.mockResolvedValue({ data: [sub("sub_1", "active", 100)] });
    const payload = event("evt_cs", "checkout.session.completed", { object: "checkout.session", customer: "cus_A", subscription: "sub_1" });
    expect((await POST(signedRequest(payload))).status).toBe(200);
    expect(accounts[0].subscription_status).toBe("active");
  });

  it("con firma inválida devuelve 400 y no cambia nada", async () => {
    list.mockResolvedValue({ data: [sub("sub_1", "active", 100)] });
    const payload = event("evt_1", "customer.subscription.updated", sub("sub_1", "active", 100));
    const response = await POST(signedRequest(payload, "whsec_otro_secreto"));
    expect(response.status).toBe(400);
    expect(list).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
    expect(accounts[0].subscription_status).toBe("none");
  });

  it("sin cabecera de firma devuelve 400", async () => {
    const request = new Request("http://localhost/api/stripe/webhook", { method: "POST", body: "{}" });
    expect((await POST(request)).status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("un cuerpo alterado tras firmar no pasa la firma", async () => {
    const payload = event("evt_1", "customer.subscription.updated", sub("sub_1", "canceled", 100));
    const request = signedRequest(payload);
    const tampered = new Request(request.url, {
      method: "POST",
      headers: request.headers,
      body: payload.replace("canceled", "active"),
    });
    expect((await POST(tampered)).status).toBe(400);
    expect(accounts[0].subscription_status).toBe("none");
  });

  it("el mismo evento dos veces se procesa una vez", async () => {
    list.mockResolvedValue({ data: [sub("sub_1", "active", 100)] });
    const payload = event("evt_1", "customer.subscription.updated", sub("sub_1", "active", 100));
    expect((await POST(signedRequest(payload))).status).toBe(200);
    list.mockResolvedValue({ data: [sub("sub_1", "canceled", 100)] });
    expect((await POST(signedRequest(payload))).status).toBe(200);
    expect(list).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(accounts[0].subscription_status).toBe("active");
  });

  it("dos copias simultáneas: la base aplica una y la otra queda como duplicado", async () => {
    list.mockResolvedValue({ data: [sub("sub_1", "active", 100)] });
    const payload = event("evt_1", "customer.subscription.updated", sub("sub_1", "active", 100));
    const responses = await Promise.all([POST(signedRequest(payload)), POST(signedRequest(payload))]);
    expect(responses.map((r) => r.status)).toEqual([200, 200]);
    const outcomes = await Promise.all(rpc.mock.results.map((r) => r.value));
    expect(outcomes.map((o) => o.data).sort()).toEqual(["aplicado", "duplicado"]);
  });

  it("un deleted anterior que llega después de un updated más reciente deja el estado que devuelve Stripe", async () => {
    // Stripe ya tiene la suscripción nueva activa; la antigua está cancelada.
    list.mockResolvedValue({ data: [sub("sub_old", "canceled", 100), sub("sub_new", "active", 200)] });
    const updated = event("evt_upd", "customer.subscription.updated", sub("sub_new", "active", 200), 1_800_000_200);
    const deleted = event("evt_del", "customer.subscription.deleted", sub("sub_old", "canceled", 100), 1_800_000_100);
    expect((await POST(signedRequest(updated))).status).toBe(200);
    expect((await POST(signedRequest(deleted))).status).toBe(200);
    expect(accounts[0]).toMatchObject({ subscription_status: "active", stripe_subscription_id: "sub_new" });
  });

  it("una cancelación real devuelve la cuenta a gratis", async () => {
    accounts[0].subscription_status = "active";
    list.mockResolvedValue({ data: [sub("sub_1", "canceled", 100)] });
    const payload = event("evt_del", "customer.subscription.deleted", sub("sub_1", "canceled", 100));
    expect((await POST(signedRequest(payload))).status).toBe(200);
    expect(accounts[0].subscription_status).toBe("canceled");
  });

  it("si el procesamiento falla, el event.id no queda guardado y el reintento se procesa", async () => {
    list.mockResolvedValue({ data: [sub("sub_1", "active", 100)] });
    const payload = event("evt_1", "customer.subscription.updated", sub("sub_1", "active", 100));
    rpcFails = true;
    expect((await POST(signedRequest(payload))).status).toBe(500);
    expect(storedEvents.has("evt_1")).toBe(false);
    expect(accounts[0].subscription_status).toBe("none");

    rpcFails = false;
    expect((await POST(signedRequest(payload))).status).toBe(200);
    expect(storedEvents.has("evt_1")).toBe(true);
    expect(accounts[0].subscription_status).toBe("active");
  });

  it("si Stripe no responde al consultar, 500 sin guardar nada", async () => {
    list.mockRejectedValue(Object.assign(new Error("red"), { code: "api_connection_error" }));
    const payload = event("evt_1", "customer.subscription.updated", sub("sub_1", "active", 100));
    expect((await POST(signedRequest(payload))).status).toBe(500);
    expect(rpc).not.toHaveBeenCalled();
    expect(storedEvents.size).toBe(0);
  });

  it("un evento de un cliente que no existe en esta base se ignora", async () => {
    const payload = event("evt_x", "customer.subscription.updated", { ...sub("sub_x", "active", 100), customer: "cus_OTRA_BASE" });
    expect((await POST(signedRequest(payload))).status).toBe(200);
    expect(list).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
    expect(storedEvents.size).toBe(0);
  });

  it("los tipos de evento que no cambian la suscripción se aceptan sin tocar nada", async () => {
    const payload = event("evt_inv", "invoice.paid", { object: "invoice", customer: "cus_A" });
    expect((await POST(signedRequest(payload))).status).toBe(200);
    expect(list).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("sin STRIPE_WEBHOOK_SECRET falla cerrado: 500 y nada procesado", async () => {
    secretMissing = true;
    const payload = event("evt_1", "customer.subscription.updated", sub("sub_1", "active", 100));
    expect((await POST(signedRequest(payload))).status).toBe(500);
    expect(list).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });
});
