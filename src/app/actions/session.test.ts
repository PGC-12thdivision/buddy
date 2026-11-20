import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SessionScope } from "@/lib/app/session-guard";
import { CATALOG } from "@/lib/domain/test-fixtures";

// Acciones de la sesión del día (plan.md U7). La base de datos se simula con un constructor de
// consultas que registra cada llamada; la RLS y los índices únicos se prueban contra staging
// (rls.integration.test.ts).

type Call = { table: string; op: string; args: unknown[] };
let calls: Call[] = [];
let userId: string | null = "u1";
let consent = true;
let scope: SessionScope | null;
let results: Record<string, { data?: unknown; error?: { code: string } | null }> = {};
const rpc = vi.fn(async (...args: unknown[]) => ({ data: args.length > 99 ? args : null, error: null }));

function builder(table: string, client: string) {
  let op = "select";
  const b: Record<string, unknown> = {};
  const chain = (name: string) => (...args: unknown[]) => {
    if (["insert", "upsert", "update", "delete"].includes(name)) op = name;
    calls.push({ table: `${client}:${table}`, op: name, args });
    return b;
  };
  for (const m of ["select", "eq", "neq", "is", "not", "in", "order", "limit", "gte", "insert", "upsert", "update", "delete"]) b[m] = chain(m);
  const result = () => results[`${table}:${op}`] ?? { data: null, error: null };
  b.maybeSingle = async () => result();
  b.single = async () => result();
  b.then = (resolve: (v: unknown) => void) => resolve(result());
  return b;
}

vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw Object.assign(new Error("NEXT_REDIRECT"), { url });
  },
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getClaims: async () => ({ data: userId ? { claims: { sub: userId } } : null }) },
    from: (t: string) => builder(t, "user"),
  }),
}));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ rpc, from: (t: string) => builder(t, "admin") }) }));
vi.mock("@/lib/wizard/account", () => ({
  sessionUserId: async () => userId,
  hasActiveConsent: async () => consent,
}));
vi.mock("@/lib/app/session-guard", () => ({ loadSessionScope: async () => scope }));
vi.mock("@/lib/app/session-data", () => ({ calibrationTarget: (a: number, b: number) => Math.round((a + b) / 2) }));
vi.mock("@/lib/app/refilter-core", () => ({ refilterForUser: vi.fn(async () => ({ ok: true, changed: 1, holes: 0 })) }));
vi.mock("@/lib/app/active-plan", () => ({ loadActivePlan: async () => null }));

const { guardarSerie, marcarMolestia, anadirLimitacion, terminarSesion } = await import("./session");

const SESSION = "11111111-1111-4111-8111-111111111111";
const SET_ID = "22222222-2222-4222-8222-222222222222";
const allowedId = CATALOG[0].id;
const otherId = CATALOG[CATALOG.length - 1].id;

const serie = (over: Record<string, unknown> = {}) => ({
  id: SET_ID,
  sessionId: SESSION,
  exerciseId: allowedId,
  setIndex: 1,
  weightKg: 40,
  reps: 10,
  rir: null,
  status: "hecha",
  ...over,
});

beforeEach(() => {
  calls = [];
  userId = "u1";
  consent = true;
  rpc.mockClear();
  results = { "set_logs:select": { data: { session_id: SESSION, exercise_id: allowedId, set_index: 1 }, error: null } };
  scope = {
    session: { id: SESSION, kind: "normal", planSessionId: "ps1", startedAt: "2026-11-18T10:00:00Z", open: true },
    catalog: CATALOG.map((e) => ({ ...e, name: e.id, jointsLight: [], technique: null, lightNote: null })),
    limitations: [],
    allowed: new Map([[allowedId, { position: 0, sets: 3, repMin: 8, repMax: 12 }]]),
    day: [],
  };
});

describe("guardarSerie", () => {
  it("sin sesión no escribe nada", async () => {
    userId = null;
    expect(await guardarSerie(serie())).toEqual({ ok: false, error: "sin_sesion" });
    expect(calls.some((c) => c.op === "upsert")).toBe(false);
  });

  it("rechaza entradas fuera de rango sin tocar la base de datos", async () => {
    expect(await guardarSerie(serie({ reps: -1 }))).toEqual({ ok: false, error: "no_valido" });
    expect(await guardarSerie(serie({ id: "no-uuid" }))).toEqual({ ok: false, error: "no_valido" });
    expect(calls).toHaveLength(0);
  });

  it("no acepta un ejercicio que no es del día ni una alternativa permitida (guardarraíl 6)", async () => {
    expect(await guardarSerie(serie({ exerciseId: otherId }))).toEqual({ ok: false, error: "no_valido" });
    expect(calls.some((c) => c.op === "upsert")).toBe(false);
  });

  it("no escribe en una sesión cerrada", async () => {
    scope!.session.open = false;
    expect(await guardarSerie(serie())).toEqual({ ok: false, error: "cerrada" });
  });

  it("guarda con su ID y sin fusionar: un reintento con el mismo ID no hace nada (KTD11)", async () => {
    expect(await guardarSerie(serie())).toEqual({ ok: true, calibration: null });
    const upsert = calls.find((c) => c.op === "upsert" && c.table === "user:set_logs");
    expect(upsert?.args[0]).toMatchObject({ id: SET_ID, user_id: "u1", session_id: SESSION, status: "hecha" });
    expect(upsert?.args[1]).toEqual({ onConflict: "id", ignoreDuplicates: true });
  });

  it("si el ID ya existía con otra serie, no la da por guardada", async () => {
    results["set_logs:select"] = { data: { session_id: SESSION, exercise_id: allowedId, set_index: 2 }, error: null };
    expect(await guardarSerie(serie())).toEqual({ ok: false, error: "duplicada" });
  });

  it("el user_id sale de los claims, nunca de la entrada", async () => {
    await guardarSerie({ ...serie(), user_id: "otro" });
    const upsert = calls.find((c) => c.op === "upsert");
    expect((upsert?.args[0] as { user_id: string }).user_id).toBe("u1");
  });
});

describe("marcarMolestia", () => {
  it("para el ejercicio con una fila neutra y suma al contador diario sin user_id", async () => {
    results["set_logs:select"] = { data: [], error: null };
    const res = await marcarMolestia({ sessionId: SESSION, exerciseId: allowedId });
    expect(res).toMatchObject({ ok: true });
    const insert = calls.find((c) => c.op === "insert" && c.table === "user:set_logs");
    expect(insert?.args[0]).toMatchObject({ status: "detenida", weight_kg: 0, reps: 0, exercise_id: allowedId });
    expect(rpc).toHaveBeenCalledWith("bump_daily_counter", { p_metric: "molestia" });
    expect(JSON.stringify(rpc.mock.calls)).not.toContain("u1");
  });

  it("sin consentimiento vigente no guarda la marca de salud ni ofrece la repetición", async () => {
    consent = false;
    results["set_logs:select"] = { data: [], error: null };
    expect(await marcarMolestia({ sessionId: SESSION, exerciseId: allowedId })).toEqual({ ok: true, repeated: false, zones: [] });
    expect(calls.some((c) => c.table === "admin:discomfort_marks")).toBe(false);
  });

  it("con consentimiento guarda la marca con el servidor, sin duplicar", async () => {
    results["set_logs:select"] = { data: [], error: null };
    await marcarMolestia({ sessionId: SESSION, exerciseId: allowedId });
    const mark = calls.find((c) => c.table === "admin:discomfort_marks" && c.op === "upsert");
    expect(mark?.args[0]).toEqual({ user_id: "u1", exercise_id: allowedId, session_id: SESSION });
    expect(mark?.args[1]).toEqual({ onConflict: "session_id,exercise_id", ignoreDuplicates: true });
  });

  it("repetida: la sesión anterior con ese ejercicio tuvo Molestia; ofrece solo zonas que carga y no están ya limitadas", async () => {
    const exercise = CATALOG.find((e) => e.joints.length >= 2)!;
    scope!.allowed = new Map([[exercise.id, { position: 0, sets: 3, repMin: 8, repMax: 12 }]]);
    scope!.limitations = [exercise.joints[0]];
    let selects = 0;
    results["set_logs:select"] = { data: [], error: null };
    // 1.ª lectura: series de hoy (ninguna); 2.ª: sesión anterior con el ejercicio.
    const orig = results;
    results = new Proxy(orig, {
      get(target, key: string) {
        if (key === "set_logs:select") return selects++ === 0 ? { data: [], error: null } : { data: [{ session_id: "prev" }], error: null };
        if (key === "discomfort_marks:select") return { data: [{ session_id: "prev" }], error: null };
        return target[key];
      },
    });
    const res = await marcarMolestia({ sessionId: SESSION, exerciseId: exercise.id });
    expect(res).toEqual({ ok: true, repeated: true, zones: exercise.joints.slice(1) });
  });

  it("no acepta ejercicios de fuera de la sesión", async () => {
    expect(await marcarMolestia({ sessionId: SESSION, exerciseId: otherId })).toEqual({ ok: false, error: "no_valido" });
    expect(rpc).not.toHaveBeenCalled();
  });
});

describe("anadirLimitacion", () => {
  it("sin consentimiento no escribe salud", async () => {
    consent = false;
    const exercise = CATALOG.find((e) => e.joints.length > 0)!;
    expect(await anadirLimitacion({ sessionId: SESSION, exerciseId: exercise.id, zones: [exercise.joints[0]] })).toEqual({
      ok: false,
      error: "sin_consentimiento",
    });
    expect(calls.some((c) => c.table === "admin:health_profile")).toBe(false);
  });

  it("solo zonas que carga ese ejercicio; las une a las actuales y refiltra", async () => {
    const exercise = CATALOG.find((e) => e.joints.length > 0)!;
    scope!.allowed = new Map([[exercise.id, { position: 0, sets: 3, repMin: 8, repMax: 12 }]]);
    scope!.limitations = ["tobillo"];
    const foreign = (["hombro", "rodilla", "codo"] as const).find((j) => !exercise.joints.includes(j))!;
    expect(await anadirLimitacion({ sessionId: SESSION, exerciseId: exercise.id, zones: [foreign] })).toEqual({ ok: false, error: "no_valido" });

    expect(await anadirLimitacion({ sessionId: SESSION, exerciseId: exercise.id, zones: [exercise.joints[0]] })).toEqual({ ok: true, changed: 1, holes: 0 });
    const update = calls.find((c) => c.table === "admin:health_profile" && c.op === "update");
    expect(update?.args[0]).toEqual({ limitations: ["tobillo", exercise.joints[0]] });
  });
});

describe("terminarSesion", () => {
  it("una sesión sin ninguna serie se borra y no cuenta como hecha", async () => {
    results["set_logs:select"] = { data: [], error: null };
    results["exercise_state:select"] = { data: [], error: null };
    await expect(terminarSesion({ sessionId: SESSION })).rejects.toMatchObject({ url: "/hoy" });
    expect(calls.some((c) => c.table === "admin:workout_sessions" && c.op === "delete")).toBe(true);
    expect(calls.some((c) => c.table === "user:workout_sessions" && c.op === "update")).toBe(false);
  });

  it("cierra solo con ended_at y lleva al fin de sesión", async () => {
    results["set_logs:select"] = { data: [{ exercise_id: "a", set_index: 1, weight_kg: 40, status: "hecha" }], error: null };
    results["exercise_state:select"] = { data: [], error: null };
    await expect(terminarSesion({ sessionId: SESSION })).rejects.toMatchObject({ url: `/sesion/${SESSION}/fin` });
    const update = calls.find((c) => c.table === "user:workout_sessions" && c.op === "update");
    expect(Object.keys(update?.args[0] as object)).toEqual(["ended_at"]);
  });

  it("sube la carga de trabajo a la más repetida y no la toca con Molestia", async () => {
    results["set_logs:select"] = {
      data: [
        { exercise_id: "a", set_index: 1, weight_kg: 45, status: "hecha" },
        { exercise_id: "a", set_index: 2, weight_kg: 45, status: "hecha" },
        { exercise_id: "b", set_index: 1, weight_kg: 50, status: "hecha" },
        { exercise_id: "b", set_index: 2, weight_kg: 0, status: "detenida" },
      ],
      error: null,
    };
    results["exercise_state:select"] = {
      data: [
        { exercise_id: "a", working_weight_kg: 42.5, calibrated_at: "2026-11-01T00:00:00Z" },
        { exercise_id: "b", working_weight_kg: 40, calibrated_at: "2026-11-01T00:00:00Z" },
      ],
      error: null,
    };
    await terminarSesion({ sessionId: SESSION }).catch(() => {});
    const updates = calls.filter((c) => c.table === "admin:exercise_state" && c.op === "update");
    expect(updates).toHaveLength(1);
    expect(updates[0].args[0]).toEqual({ working_weight_kg: 45 });
  });

  it("con marca de Molestia en la sesión tampoco cambia la carga, aunque falte la fila detenida", async () => {
    results["set_logs:select"] = { data: [{ exercise_id: "a", set_index: 1, weight_kg: 50, status: "hecha" }], error: null };
    results["exercise_state:select"] = { data: [{ exercise_id: "a", working_weight_kg: 40, calibrated_at: "2026-11-01T00:00:00Z" }], error: null };
    results["discomfort_marks:select"] = { data: [{ exercise_id: "a" }], error: null };
    await terminarSesion({ sessionId: SESSION }).catch(() => {});
    expect(calls.some((c) => c.table === "admin:exercise_state" && c.op === "update")).toBe(false);
  });
});
