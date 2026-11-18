import { afterEach, describe, expect, it, vi } from "vitest";
import { inactivityPeriod } from "./inactivity";
import {
  appUrlFrom,
  deliverOnce,
  emailConfig,
  recipientAllowed,
  RESEND_URL,
  sendEmail,
  type EmailConfig,
  type EmailLogStore,
  type LogStatus,
} from "./send";
import { inactivityEmail, purchaseEmail, welcomeEmail } from "./templates";

const config = (over: Partial<EmailConfig> = {}): EmailConfig => ({
  apiKey: "re_test",
  from: "BUDDY <onboarding@resend.dev>",
  allowlist: new Set(["pablo@buddy.test"]),
  production: false,
  appUrl: "https://buddy.test",
  ...over,
});

function memoryStore(initial: Record<string, LogStatus> = {}) {
  const rows = new Map<string, { status: LogStatus; errorCode: string | null }>(
    Object.entries(initial).map(([key, status]) => [key, { status, errorCode: null }]),
  );
  const store: EmailLogStore = {
    status: async (userId, kind, period) => rows.get(`${userId}/${kind}/${period}`)?.status ?? null,
    record: async ({ userId, kind, period, status, errorCode }) => {
      rows.set(`${userId}/${kind}/${period}`, { status, errorCode });
    },
  };
  return { store, rows };
}

const ok = () => vi.fn(async () => new Response(JSON.stringify({ id: "msg_1" }), { status: 200 }));

afterEach(() => vi.restoreAllMocks());

describe("emailConfig", () => {
  it("sin RESEND_API_KEY falla cerrado y el error nombra la variable", () => {
    expect(() => emailConfig({})).toThrow("RESEND_API_KEY");
  });

  it("lee la lista de direcciones sin mayúsculas ni espacios y usa el remitente de pruebas", () => {
    const cfg = emailConfig({ RESEND_API_KEY: "re_x", EMAIL_ALLOWLIST: " Pablo@Buddy.test , ,otro@buddy.test" });
    expect([...cfg.allowlist!]).toEqual(["pablo@buddy.test", "otro@buddy.test"]);
    expect(cfg.from).toBe("BUDDY <onboarding@resend.dev>");
    expect(cfg.production).toBe(false);
  });

  it("la URL de los enlaces sale de APP_URL o de Vercel según el entorno", () => {
    expect(appUrlFrom({ APP_URL: "https://mi.app/" })).toBe("https://mi.app");
    expect(appUrlFrom({ VERCEL_ENV: "production", VERCEL_PROJECT_PRODUCTION_URL: "buddy.vercel.app", VERCEL_URL: "x.vercel.app" })).toBe(
      "https://buddy.vercel.app",
    );
    expect(appUrlFrom({ VERCEL_ENV: "preview", VERCEL_BRANCH_URL: "buddy-git-staging.vercel.app" })).toBe("https://buddy-git-staging.vercel.app");
    expect(appUrlFrom({})).toBe("http://localhost:3000");
  });
});

describe("recipientAllowed (D7)", () => {
  it("fuera de producción sin lista no se envía a nadie", () => {
    expect(recipientAllowed(config({ allowlist: null }), "pablo@buddy.test")).toBe(false);
  });
  it("con lista solo a sus direcciones, en cualquier entorno", () => {
    expect(recipientAllowed(config(), "PABLO@buddy.test")).toBe(true);
    expect(recipientAllowed(config({ production: true }), "otra@buddy.test")).toBe(false);
  });
  it("en producción sin lista, a todos", () => {
    expect(recipientAllowed(config({ allowlist: null, production: true }), "otra@buddy.test")).toBe(true);
  });
});

describe("sendEmail", () => {
  it("llama a la API de Resend con la clave en Bearer, la clave de idempotencia y un único destinatario", async () => {
    const fetchImpl = ok();
    const result = await sendEmail(config(), { ...welcomeEmail("https://buddy.test"), to: "pablo@buddy.test", idempotencyKey: "bienvenida/u1/unico" }, fetchImpl);
    expect(result).toEqual({ ok: true });
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(RESEND_URL);
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer re_test");
    expect(headers["Idempotency-Key"]).toBe("bienvenida/u1/unico");
    const body = JSON.parse(init.body as string);
    expect(body.to).toEqual(["pablo@buddy.test"]);
    expect(body.subject).toBe("Te damos la bienvenida a BUDDY");
    expect(body.text).toContain("https://buddy.test/hoy");
  });

  it("un error de Resend se queda en un código fijo, sin leer el cuerpo (que puede llevar la dirección)", async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ message: "pablo@buddy.test no permitido" }), { status: 403 }));
    expect(await sendEmail(config(), { ...welcomeEmail("x"), to: "pablo@buddy.test", idempotencyKey: "k" }, fetchImpl)).toEqual({
      ok: false,
      code: "resend_403",
    });
  });

  it("un fallo de red o un tiempo agotado también dan un código fijo", async () => {
    const red = vi.fn(async () => {
      throw new TypeError("fetch failed: getaddrinfo pablo@buddy.test");
    });
    const timeout = vi.fn(async () => {
      throw Object.assign(new Error("timeout"), { name: "TimeoutError" });
    });
    const msg = { ...welcomeEmail("x"), to: "pablo@buddy.test", idempotencyKey: "k" };
    expect(await sendEmail(config(), msg, red)).toEqual({ ok: false, code: "resend_red" });
    expect(await sendEmail(config(), msg, timeout)).toEqual({ ok: false, code: "resend_timeout" });
  });
});

describe("deliverOnce", () => {
  const delivery = { userId: "u1", kind: "compra" as const, period: "sub_1", to: "pablo@buddy.test", email: purchaseEmail("https://buddy.test") };

  it("envía y deja una fila sent", async () => {
    const { store, rows } = memoryStore();
    const fetchImpl = ok();
    expect(await deliverOnce({ config: config(), store, fetchImpl }, delivery)).toBe("sent");
    expect(rows.get("u1/compra/sub_1")).toEqual({ status: "sent", errorCode: null });
  });

  it("si ya se envió no vuelve a enviar (reintento del webhook)", async () => {
    const { store } = memoryStore({ "u1/compra/sub_1": "sent" });
    const fetchImpl = ok();
    expect(await deliverOnce({ config: config(), store, fetchImpl }, delivery)).toBe("duplicate");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("un fallo deja una fila failed con el código y se reintenta en la siguiente llamada", async () => {
    const { store, rows } = memoryStore();
    const failing = vi.fn(async () => new Response("{}", { status: 500 }));
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await deliverOnce({ config: config(), store, fetchImpl: failing }, delivery)).toBe("failed");
    expect(rows.get("u1/compra/sub_1")).toEqual({ status: "failed", errorCode: "resend_500" });
    expect(errors.mock.calls.flat().join(" ")).not.toContain("pablo@buddy.test");

    expect(await deliverOnce({ config: config(), store, fetchImpl: ok() }, delivery)).toBe("sent");
    expect(rows.get("u1/compra/sub_1")?.status).toBe("sent");
  });

  it("una dirección fuera de la lista no se envía ni deja fila", async () => {
    const { store, rows } = memoryStore();
    const fetchImpl = ok();
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await deliverOnce({ config: config(), store, fetchImpl }, { ...delivery, to: "otra@buddy.test" })).toBe("skipped");
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(rows.size).toBe(0);
  });

  it("si no se puede leer el registro no envía: mejor ninguno que dos", async () => {
    const fetchImpl = ok();
    vi.spyOn(console, "error").mockImplementation(() => {});
    const store: EmailLogStore = { status: async () => Promise.reject({ code: "PGRST000" }), record: async () => {} };
    expect(await deliverOnce({ config: config(), store, fetchImpl }, delivery)).toBe("failed");
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe("plantillas (DESIGN.md §9)", () => {
  const all = [welcomeEmail("https://buddy.test"), purchaseEmail("https://buddy.test"), inactivityEmail("https://buddy.test")];

  it("columna de 600 px, un único botón limón con tinta y un enlace a la app", () => {
    for (const email of all) {
      expect(email.html).toContain('width="600"');
      expect(email.html.match(/<a /g)).toHaveLength(1);
      expect(email.html).toContain("background:#FFE03A;border:2px solid #1A0F24");
      expect(email.html).toContain('href="https://buddy.test/hoy"');
      expect(email.text).toContain("https://buddy.test/hoy");
      expect(email.subject.length).toBeGreaterThan(0);
    }
  });

  it("la confirmación de compra lleva el nombre del producto en el asunto", () => {
    expect(purchaseEmail("x").subject).toContain("BUDDY Premium");
  });

  it("ningún email menciona datos de salud", () => {
    const words = /limitaci|molestia|lesi|rodilla|hombro|lumbar|cadera|cribado|dolor|articula/i;
    for (const email of all) expect(`${email.subject}${email.html}${email.text}`).not.toMatch(words);
  });
});

describe("inactivityPeriod", () => {
  const now = new Date("2026-11-30T08:00:00Z");
  it("más de 14 días desde la última sesión: periodo con el día de esa sesión", () => {
    expect(inactivityPeriod({ createdAt: "2026-10-01T10:00:00Z", lastSessionEndedAt: "2026-11-15T07:00:00Z", now })).toBe("desde-2026-11-15");
  });
  it("14 días justos o menos: nada", () => {
    expect(inactivityPeriod({ createdAt: "2026-10-01T10:00:00Z", lastSessionEndedAt: "2026-11-16T08:00:00Z", now })).toBeNull();
  });
  it("sin sesiones cuenta desde el registro", () => {
    expect(inactivityPeriod({ createdAt: "2026-11-01T10:00:00Z", lastSessionEndedAt: null, now })).toBe("desde-2026-11-01");
    expect(inactivityPeriod({ createdAt: "2026-11-20T10:00:00Z", lastSessionEndedAt: null, now })).toBeNull();
  });
});
