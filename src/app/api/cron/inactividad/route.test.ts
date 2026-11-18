import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Escenarios de plan.md U10. Base de datos en memoria y fetch de Resend sustituido: no sale ningún email.

type Row = { status: "sent" | "failed"; errorCode: string | null };
const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date("2026-11-30T08:00:00Z");
const daysAgo = (days: number) => new Date(NOW.getTime() - days * DAY).toISOString();

let users: { id: string; email: string; createdAt: string }[] = [];
let sessions: Record<string, string | null> = {};
let log = new Map<string, Row>();

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({}) }));
vi.mock("@/lib/email/store", () => ({
  confirmedUsers: async () => users,
  lastFinishedSession: async (_admin: unknown, userId: string) => {
    if (sessions[userId] === "boom") throw { code: "PGRST000" };
    return sessions[userId] ?? null;
  },
  emailLogStore: () => ({
    status: async (userId: string, kind: string, period: string) => log.get(`${userId}/${kind}/${period}`)?.status ?? null,
    record: async (row: { userId: string; kind: string; period: string } & Row) => {
      log.set(`${row.userId}/${row.kind}/${row.period}`, { status: row.status, errorCode: row.errorCode });
    },
  }),
}));

const { GET } = await import("./route");

const fetchMock = vi.fn<typeof fetch>();
const call = (authorization?: string) =>
  GET(new NextRequest("https://buddy.test/api/cron/inactividad", { headers: authorization ? { authorization } : {} }));
const recipients = () => fetchMock.mock.calls.map(([, init]) => JSON.parse(String(init?.body)).to[0]);

beforeEach(() => {
  vi.useFakeTimers({ now: NOW, toFake: ["Date"] });
  vi.stubEnv("CRON_SECRET", "secreto-de-prueba");
  vi.stubEnv("RESEND_API_KEY", "re_test");
  vi.stubEnv("EMAIL_ALLOWLIST", "a@buddy.test,b@buddy.test,c@buddy.test");
  vi.stubEnv("VERCEL_ENV", "preview");
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  fetchMock.mockImplementation(async () => new Response("{}", { status: 200 }));
  vi.spyOn(console, "error").mockImplementation(() => {});
  users = [];
  sessions = {};
  log = new Map();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("/api/cron/inactividad: autorización (KTD9)", () => {
  it("sin la cabecera o con un secreto incorrecto devuelve 401 y no envía nada", async () => {
    users = [{ id: "u1", email: "a@buddy.test", createdAt: daysAgo(30) }];
    for (const auth of [undefined, "Bearer otro", "secreto-de-prueba", "Bearer secreto-de-prueba-mas"]) {
      expect((await call(auth)).status).toBe(401);
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("con CRON_SECRET sin configurar falla cerrado, también con 'Bearer ' vacío", async () => {
    vi.stubEnv("CRON_SECRET", "");
    expect((await call("Bearer ")).status).toBe(401);
    expect((await call("Bearer undefined")).status).toBe(401);
  });

  it("sin RESEND_API_KEY responde 500 sin enviar", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    expect((await call("Bearer secreto-de-prueba")).status).toBe(500);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("/api/cron/inactividad: envíos", () => {
  it("un usuario con 15 días sin sesiones recibe un email y deja una fila sent", async () => {
    users = [{ id: "u1", email: "a@buddy.test", createdAt: daysAgo(60) }];
    sessions = { u1: daysAgo(15) };
    const response = await call("Bearer secreto-de-prueba");
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ status: "ok", sent: 1, failed: 0 });
    expect(recipients()).toEqual(["a@buddy.test"]);
    expect([...log.entries()]).toEqual([[`u1/inactividad/desde-${daysAgo(15).slice(0, 10)}`, { status: "sent", errorCode: null }]]);
  });

  it("ejecutar el cron dos veces el mismo día no envía un segundo email", async () => {
    users = [{ id: "u1", email: "a@buddy.test", createdAt: daysAgo(60) }];
    sessions = { u1: daysAgo(20) };
    await call("Bearer secreto-de-prueba");
    const second = await call("Bearer secreto-de-prueba");
    expect(await second.json()).toMatchObject({ sent: 0, duplicate: 1 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("al día siguiente, el mismo parón tampoco repite email", async () => {
    users = [{ id: "u1", email: "a@buddy.test", createdAt: daysAgo(60) }];
    sessions = { u1: daysAgo(20) };
    await call("Bearer secreto-de-prueba");
    vi.setSystemTime(new Date(NOW.getTime() + DAY));
    await call("Bearer secreto-de-prueba");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("un fallo de Resend deja una fila failed con el código y no detiene al resto", async () => {
    users = [
      { id: "u1", email: "a@buddy.test", createdAt: daysAgo(60) },
      { id: "u2", email: "b@buddy.test", createdAt: daysAgo(60) },
      { id: "u3", email: "c@buddy.test", createdAt: daysAgo(60) },
    ];
    sessions = { u1: daysAgo(30), u2: "boom", u3: daysAgo(30) };
    fetchMock.mockImplementationOnce(async () => new Response('{"message":"a@buddy.test"}', { status: 422 }));
    const body = await (await call("Bearer secreto-de-prueba")).json();
    expect(body).toMatchObject({ revisados: 3, sent: 1, failed: 2 });
    const rows = [...log.values()];
    expect(rows).toContainEqual({ status: "failed", errorCode: "resend_422" });
    expect(rows).toContainEqual({ status: "sent", errorCode: null });
    // Ni los logs ni la respuesta llevan direcciones ni mensajes de Resend.
    const logged = vi.mocked(console.error).mock.calls.flat().join(" ");
    expect(logged).not.toContain("@buddy.test");
    expect(JSON.stringify(body)).not.toContain("@");
  });

  it("no avisa a quien entrenó hace poco ni a quien se registró hace menos de 14 días", async () => {
    users = [
      { id: "activo", email: "a@buddy.test", createdAt: daysAgo(60) },
      { id: "nuevo", email: "b@buddy.test", createdAt: daysAgo(5) },
      { id: "sin_sesiones", email: "c@buddy.test", createdAt: daysAgo(16) },
    ];
    sessions = { activo: daysAgo(3) };
    await call("Bearer secreto-de-prueba");
    expect(recipients()).toEqual(["c@buddy.test"]);
  });

  it("fuera de producción sin EMAIL_ALLOWLIST no envía (D7) ni deja filas", async () => {
    vi.stubEnv("EMAIL_ALLOWLIST", "");
    users = [{ id: "u1", email: "a@buddy.test", createdAt: daysAgo(60) }];
    const body = await (await call("Bearer secreto-de-prueba")).json();
    expect(body).toMatchObject({ skipped: 1, sent: 0 });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(log.size).toBe(0);
  });
});
