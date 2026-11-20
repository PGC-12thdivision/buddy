import { beforeEach, describe, expect, it, vi } from "vitest";

// Checkout (plan.md U9, KTD8): precio y cliente los fija el servidor; del navegador solo se acepta
// "volver" de una lista cerrada. Stripe y Supabase falsos, sin red.

let userId: string | null;
let account: { subscription_status: string; stripe_customer_id: string | null } | null;
let storedCustomer: string | null;
const customersCreate = vi.fn();
const sessionsCreate = vi.fn();
const adminUpdates: unknown[] = [];

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getClaims: async () => ({ data: userId ? { claims: { sub: userId } } : null }) },
    from: () => {
      const b = { select: () => b, eq: () => b, maybeSingle: async () => ({ data: account, error: null }) };
      return b;
    },
  }),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => {
      const b = {
        update: (payload: { stripe_customer_id: string }) => {
          adminUpdates.push(payload);
          storedCustomer ??= payload.stripe_customer_id;
          return b;
        },
        select: () => b,
        eq: () => b,
        is: () => b,
        maybeSingle: async () => ({ data: { stripe_customer_id: storedCustomer }, error: null }),
        then: (resolve: (v: unknown) => void) => resolve({ error: null }),
      };
      return b;
    },
  }),
}));

vi.mock("@/lib/stripe", () => ({
  getStripe: () => ({ customers: { create: customersCreate }, checkout: { sessions: { create: sessionsCreate } } }),
  premiumPriceId: () => "price_del_servidor",
}));

const { POST } = await import("./route");

function formRequest(fields: Record<string, string>, origin = "http://localhost:3000") {
  const body = new FormData();
  for (const [k, v] of Object.entries(fields)) body.set(k, v);
  return new Request("http://localhost:3000/api/stripe/checkout", { method: "POST", headers: { origin }, body });
}

beforeEach(() => {
  userId = "user-a";
  account = { subscription_status: "none", stripe_customer_id: "cus_guardado" };
  storedCustomer = "cus_guardado";
  customersCreate.mockReset();
  sessionsCreate.mockReset();
  sessionsCreate.mockResolvedValue({ url: "https://checkout.stripe.com/c/pay/cs_test_1" });
  adminUpdates.length = 0;
});

describe("POST /api/stripe/checkout", () => {
  it("ignora cualquier precio o cliente enviado por el navegador", async () => {
    const response = await POST(formRequest({ price: "price_falso", customer: "cus_ajeno", line_items: "x", volver: "/ajustes" }));
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("https://checkout.stripe.com/c/pay/cs_test_1");
    const params = sessionsCreate.mock.calls[0][0];
    expect(params).toMatchObject({
      mode: "subscription",
      customer: "cus_guardado",
      line_items: [{ price: "price_del_servidor", quantity: 1 }],
      client_reference_id: "user-a",
    });
    expect(JSON.stringify(params)).not.toContain("price_falso");
    expect(JSON.stringify(params)).not.toContain("cus_ajeno");
  });

  it("las URL de vuelta van a la pantalla de vuelta sin session_id", async () => {
    await POST(formRequest({ volver: "/ajustes" }));
    const params = sessionsCreate.mock.calls[0][0];
    expect(params.success_url).toBe("http://localhost:3000/premium/vuelta?volver=%2Fajustes");
    expect(params.cancel_url).toBe("http://localhost:3000/premium/vuelta?estado=cancelado&volver=%2Fajustes");
    expect(params.success_url).not.toContain("CHECKOUT_SESSION_ID");
  });

  it("un destino de vuelta fuera de la lista cerrada vuelve a Hoy", async () => {
    await POST(formRequest({ volver: "https://malicioso.example" }));
    expect(sessionsCreate.mock.calls[0][0].success_url).toBe("http://localhost:3000/premium/vuelta?volver=%2Fhoy");
  });

  it("sin cliente de Stripe, lo crea con clave de idempotencia y lo guarda solo si está vacío", async () => {
    account = { subscription_status: "none", stripe_customer_id: null };
    storedCustomer = null;
    customersCreate.mockResolvedValue({ id: "cus_nuevo" });
    await POST(formRequest({}));
    expect(customersCreate).toHaveBeenCalledWith(
      { metadata: { buddy_user_id: "user-a" } },
      { idempotencyKey: "buddy-cliente-user-a" },
    );
    expect(adminUpdates).toHaveLength(1);
    expect(sessionsCreate.mock.calls[0][0].customer).toBe("cus_nuevo");
  });

  it("si otra petición ya guardó un cliente, usa el guardado", async () => {
    account = { subscription_status: "none", stripe_customer_id: null };
    storedCustomer = "cus_de_la_otra_peticion";
    customersCreate.mockResolvedValue({ id: "cus_nuevo" });
    await POST(formRequest({}));
    expect(sessionsCreate.mock.calls[0][0].customer).toBe("cus_de_la_otra_peticion");
  });

  it("quien ya paga no abre un segundo cobro", async () => {
    account = { subscription_status: "active", stripe_customer_id: "cus_guardado" };
    const response = await POST(formRequest({}));
    expect(response.headers.get("location")).toBe("http://localhost:3000/premium");
    expect(sessionsCreate).not.toHaveBeenCalled();
  });

  it("sin sesión lleva a entrar y no llama a Stripe", async () => {
    userId = null;
    const response = await POST(formRequest({}));
    expect(response.headers.get("location")).toBe("http://localhost:3000/entrar");
    expect(sessionsCreate).not.toHaveBeenCalled();
  });

  it("rechaza un formulario enviado desde otro origen", async () => {
    const response = await POST(formRequest({}, "https://otro.example"));
    expect(response.status).toBe(403);
    expect(sessionsCreate).not.toHaveBeenCalled();
  });

  it("si Stripe falla, vuelve a ¿CONTINUAR? con el error", async () => {
    sessionsCreate.mockRejectedValue(Object.assign(new Error("x"), { code: "api_error" }));
    const response = await POST(formRequest({}));
    expect(response.headers.get("location")).toBe("http://localhost:3000/premium?error=pago");
  });
});
