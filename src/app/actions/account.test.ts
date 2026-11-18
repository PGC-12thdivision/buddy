import { beforeEach, describe, expect, it, vi } from "vitest";
import { CATALOG } from "@/lib/domain/test-fixtures";

// Acciones de Ajustes (plan.md U11). La base de datos se simula con un constructor de consultas que
// registra cada llamada; la RLS se prueba contra staging (rls.integration.test.ts).

type Call = { table: string; op: string; args: unknown[] };
let calls: Call[] = [];
let userId: string | null = "u1";
let consent = true;
let results: Record<string, { data?: unknown; error?: { code: string } | null }> = {};
const cookieSet = vi.fn();
const refilterForUser = vi.fn();
const generateAndSavePlan = vi.fn();

function builder(table: string, client: string) {
  let op = "select";
  const b: Record<string, unknown> = {};
  const chain = (name: string) => (...args: unknown[]) => {
    if (["insert", "upsert", "update", "delete"].includes(name)) op = name;
    calls.push({ table: `${client}:${table}`, op: name, args });
    return b;
  };
  for (const m of ["select", "eq", "is", "limit", "insert", "upsert", "update", "delete"]) b[m] = chain(m);
  const result = () => results[`${table}:${op}`] ?? { data: null, error: null };
  b.maybeSingle = async () => result();
  b.then = (resolve: (v: unknown) => void) => resolve(result());
  return b;
}

vi.mock("next/headers", () => ({ cookies: async () => ({ set: cookieSet }) }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getClaims: async () => ({ data: userId ? { claims: { sub: userId } } : null }) },
    from: (t: string) => builder(t, "user"),
  }),
}));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ from: (t: string) => builder(t, "admin") }) }));
vi.mock("@/lib/wizard/account", () => ({
  sessionUserId: async () => userId,
  hasActiveConsent: async () => consent,
  accountProgress: async () => ({ hasConsent: consent, hasHealthProfile: false, hasActivePlan: true }),
}));
vi.mock("@/lib/app/refilter-core", () => ({ refilterForUser: (...args: unknown[]) => refilterForUser(...args) }));
vi.mock("@/lib/app/plan-generation", () => ({ generateAndSavePlan: (...args: unknown[]) => generateAndSavePlan(...args) }));
vi.mock("@/lib/catalog", () => ({
  equipmentCatalog: async () => [
    { id: "mancuernas", name: "Mancuernas", zone: "peso_libre" },
    { id: "banco", name: "Banco", zone: "peso_libre" },
  ],
  exerciseCatalog: async () => CATALOG.map((e) => ({ ...e, name: e.id })),
  sanitizeEquipment: (ids: string[], known: string[]) => [...new Set(ids)].filter((id) => known.includes(id)),
}));

const { guardarGimnasio, guardarLimitaciones, cambiarFocoDias, guardarPreferencias, retirarConsentimiento } = await import("./account");

const writes = (op: string) => calls.filter((c) => c.op === op);
const ALL_EQUIPMENT = [...new Set(CATALOG.map((e) => e.equipmentTypeId))];

beforeEach(() => {
  calls = [];
  userId = "u1";
  consent = true;
  cookieSet.mockClear();
  refilterForUser.mockReset().mockResolvedValue({ ok: true, changed: 2, holes: 1 });
  generateAndSavePlan.mockReset().mockResolvedValue("ok");
  results = {
    "health_profile:update": { data: [{ user_id: "u1" }], error: null },
    "health_profile:select": { data: { limitations: ["rodilla"] }, error: null },
    "onboarding_answers:select": { data: { focus: "equilibrado", days_per_week: 3, minutes_per_session: 60, sports: [] }, error: null },
    "gym_profiles:select": { data: { equipment_type_ids: ALL_EQUIPMENT }, error: null },
    "account_status:select": { data: { trial_ends_at: "2020-01-01T00:00:00Z", subscription_status: "none" }, error: null },
  };
});

describe("guardarGimnasio", () => {
  it("sin sesión no escribe nada", async () => {
    userId = null;
    expect(await guardarGimnasio({ gymPreset: "basico", equipmentTypeIds: ["banco"] })).toEqual({ ok: false, error: "sin_sesion" });
    expect(calls).toHaveLength(0);
  });

  it("rechaza entradas sin equipo o con IDs mal formados sin tocar la base de datos", async () => {
    expect(await guardarGimnasio({ gymPreset: "basico", equipmentTypeIds: [] })).toEqual({ ok: false, error: "no_valido" });
    expect(await guardarGimnasio({ gymPreset: "otro", equipmentTypeIds: ["banco"] })).toEqual({ ok: false, error: "no_valido" });
    expect(await guardarGimnasio({ gymPreset: "basico", equipmentTypeIds: ["DROP TABLE"] })).toEqual({ ok: false, error: "no_valido" });
    expect(calls).toHaveLength(0);
  });

  it("guarda solo IDs del catálogo (D56) con el user_id de los claims y refiltra", async () => {
    const result = await guardarGimnasio({ gymPreset: "peso_libre", equipmentTypeIds: ["banco", "inventado", "banco", "mancuernas"] });
    expect(result).toEqual({ ok: true, changed: 2, holes: 1 });
    const upsert = writes("upsert")[0];
    expect(upsert.table).toBe("user:gym_profiles");
    expect(upsert.args[0]).toMatchObject({ user_id: "u1", preset: "peso_libre", equipment_type_ids: ["banco", "mancuernas"] });
    expect(refilterForUser).toHaveBeenCalledWith(expect.anything(), "u1");
  });

  it("solo IDs desconocidos: no es un gimnasio", async () => {
    expect(await guardarGimnasio({ gymPreset: "basico", equipmentTypeIds: ["inventado"] })).toEqual({ ok: false, error: "no_valido" });
    expect(writes("upsert")).toHaveLength(0);
  });

  it("si el refiltrado falla, avisa del fallo", async () => {
    refilterForUser.mockResolvedValue({ ok: false, error: "fallo" });
    expect(await guardarGimnasio({ gymPreset: "basico", equipmentTypeIds: ["banco"] })).toEqual({ ok: false, error: "fallo" });
  });
});

describe("guardarLimitaciones", () => {
  it("sin consentimiento vigente no escribe datos de salud (guardarraíl 8)", async () => {
    consent = false;
    expect(await guardarLimitaciones({ limitations: ["hombro"] })).toEqual({ ok: false, error: "sin_consentimiento" });
    expect(writes("update")).toHaveLength(0);
    expect(refilterForUser).not.toHaveBeenCalled();
  });

  it("solo acepta zonas de la lista cerrada (sin texto libre)", async () => {
    expect(await guardarLimitaciones({ limitations: ["me duele la rodilla"] })).toEqual({ ok: false, error: "no_valido" });
    expect(calls).toHaveLength(0);
  });

  it("cambia solo las limitaciones con el cliente admin, sin tocar el cribado, y refiltra", async () => {
    expect(await guardarLimitaciones({ limitations: ["hombro", "hombro", "rodilla"] })).toEqual({ ok: true, changed: 2, holes: 1 });
    const update = writes("update")[0];
    expect(update.table).toBe("admin:health_profile");
    expect(Object.keys(update.args[0] as object).sort()).toEqual(["limitations", "updated_at"]);
    expect(update.args[0]).toMatchObject({ limitations: ["hombro", "rodilla"] });
    expect(calls.find((c) => c.table === "admin:health_profile" && c.op === "eq")?.args).toEqual(["user_id", "u1"]);
    expect(refilterForUser).toHaveBeenCalledOnce();
  });

  it("quitar todas las limitaciones también refiltra", async () => {
    expect(await guardarLimitaciones({ limitations: [] })).toEqual({ ok: true, changed: 2, holes: 1 });
    expect(writes("update")[0].args[0]).toMatchObject({ limitations: [] });
    expect(refilterForUser).toHaveBeenCalledOnce();
  });

  it("sin perfil de salud no lo crea", async () => {
    results["health_profile:update"] = { data: [], error: null };
    expect(await guardarLimitaciones({ limitations: ["codo"] })).toEqual({ ok: false, error: "sin_cribado" });
    expect(writes("upsert")).toHaveLength(0);
    expect(refilterForUser).not.toHaveBeenCalled();
  });

  it("un error de base de datos se registra solo con su código", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    results["health_profile:update"] = { data: null, error: { code: "23514" } };
    expect(await guardarLimitaciones({ limitations: ["tobillo"] })).toEqual({ ok: false, error: "fallo" });
    expect(log.mock.calls.flat().join(" ")).not.toContain("tobillo");
    log.mockRestore();
  });
});

describe("cambiarFocoDias", () => {
  it("rechaza valores fuera de las opciones", async () => {
    expect(await cambiarFocoDias({ focus: "cardio", daysPerWeek: 3 })).toEqual({ ok: false, error: "no_valido" });
    expect(await cambiarFocoDias({ focus: "fuerza", daysPerWeek: 6 })).toEqual({ ok: false, error: "no_valido" });
    expect(generateAndSavePlan).not.toHaveBeenCalled();
  });

  it("sin consentimiento o sin cribado no llama a la IA", async () => {
    consent = false;
    expect(await cambiarFocoDias({ focus: "fuerza", daysPerWeek: 3 })).toEqual({ ok: false, error: "sin_permiso" });
    consent = true;
    results["health_profile:select"] = { data: null, error: null };
    expect(await cambiarFocoDias({ focus: "fuerza", daysPerWeek: 3 })).toEqual({ ok: false, error: "sin_permiso" });
    expect(generateAndSavePlan).not.toHaveBeenCalled();
  });

  it("sin cambios no gasta una generación", async () => {
    expect(await cambiarFocoDias({ focus: "equilibrado", daysPerWeek: 3 })).toEqual({ ok: false, error: "sin_cambios" });
    expect(generateAndSavePlan).not.toHaveBeenCalled();
  });

  it("gratis: regenera con el límite de 1 al mes y guarda el nuevo foco y días", async () => {
    expect(await cambiarFocoDias({ focus: "fuerza", daysPerWeek: 4 })).toEqual({ ok: true });
    expect(generateAndSavePlan).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "u1", kind: "regenerar", periodLimit: 1, focus: "fuerza", days: 4, limitations: ["rodilla"] }),
    );
    const update = writes("update")[0];
    expect(update.table).toBe("admin:onboarding_answers");
    expect(update.args[0]).toMatchObject({ focus: "fuerza", days_per_week: 4 });
  });

  it("premium: el tope mensual es el de regeneraciones premium", async () => {
    results["account_status:select"] = { data: { trial_ends_at: "2020-01-01T00:00:00Z", subscription_status: "active" }, error: null };
    await cambiarFocoDias({ focus: "musculo", daysPerWeek: 3 });
    expect(generateAndSavePlan).toHaveBeenCalledWith(expect.objectContaining({ periodLimit: 5 }));
  });

  it("un segundo cambio en el mes siendo gratis se rechaza con la fecha del mes siguiente (D26)", async () => {
    generateAndSavePlan.mockResolvedValue("limite");
    const result = await cambiarFocoDias({ focus: "fuerza", daysPerWeek: 3 });
    expect(result).toMatchObject({ ok: false, error: "limite" });
    expect((result as { availableFrom: string }).availableFrom).toMatch(/^1 de [a-z]+$/);
    expect(writes("update")).toHaveLength(0);
  });

  it("si la generación falla, las respuestas no cambian", async () => {
    generateAndSavePlan.mockResolvedValue("validacion");
    expect(await cambiarFocoDias({ focus: "grasa", daysPerWeek: 2 })).toEqual({ ok: false, error: "validacion" });
    expect(writes("update")).toHaveLength(0);
  });
});

describe("guardarPreferencias", () => {
  it("rechaza una entrada vacía o un tema desconocido", async () => {
    expect(await guardarPreferencias({})).toEqual({ ok: false, error: "no_valido" });
    expect(await guardarPreferencias({ theme: "rosa" })).toEqual({ ok: false, error: "no_valido" });
    expect(calls).toHaveLength(0);
  });

  it("guarda el tema en user_settings y en la cookie", async () => {
    expect(await guardarPreferencias({ theme: "dark" })).toEqual({ ok: true });
    const update = writes("update")[0];
    expect(update.table).toBe("user:user_settings");
    expect(update.args[0]).toMatchObject({ theme: "dark" });
    expect(update.args[0]).not.toHaveProperty("show_rest_timer");
    expect(cookieSet).toHaveBeenCalledWith("buddy-tema", "dark", expect.objectContaining({ path: "/" }));
  });

  it("guarda el contador de descanso sin tocar el tema", async () => {
    expect(await guardarPreferencias({ showRestTimer: false })).toEqual({ ok: true });
    expect(writes("update")[0].args[0]).toMatchObject({ show_rest_timer: false });
    expect(writes("update")[0].args[0]).not.toHaveProperty("theme");
    expect(cookieSet).not.toHaveBeenCalled();
  });
});

describe("retirarConsentimiento", () => {
  it("sin sesión no hace nada", async () => {
    userId = null;
    expect(await retirarConsentimiento()).toEqual({ ok: false, error: "sin_sesion" });
    expect(calls).toHaveLength(0);
  });

  it("retira el vigente y borra health_profile y discomfort_marks; después va al consentimiento", async () => {
    consent = false;
    expect(await retirarConsentimiento()).toEqual({ ok: true, next: "/consentimiento" });
    const withdraw = writes("update")[0];
    expect(withdraw.table).toBe("user:consents");
    expect(withdraw.args[0]).toHaveProperty("withdrawn_at");
    expect(writes("delete").map((c) => c.table).sort()).toEqual(["admin:discomfort_marks", "admin:health_profile"]);
    for (const table of ["admin:health_profile", "admin:discomfort_marks"]) {
      expect(calls.find((c) => c.table === table && c.op === "eq")?.args).toEqual(["user_id", "u1"]);
    }
  });

  it("si el borrado falla, avisa; repetirla vuelve a borrar", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    results["discomfort_marks:delete"] = { data: null, error: { code: "57014" } };
    expect(await retirarConsentimiento()).toEqual({ ok: false, error: "fallo" });
    results["discomfort_marks:delete"] = { data: null, error: null };
    calls = [];
    expect((await retirarConsentimiento()).ok).toBe(true);
    expect(writes("delete")).toHaveLength(2);
  });

  it("si no se puede retirar, no borra nada", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    results["consents:update"] = { data: null, error: { code: "42501" } };
    expect(await retirarConsentimiento()).toEqual({ ok: false, error: "fallo" });
    expect(writes("delete")).toHaveLength(0);
  });
});
