import { beforeEach, describe, expect, it, vi } from "vitest";
import { CATALOG, ALL_EQUIPMENT_IDS } from "@/lib/domain/test-fixtures";
import type { CallModel } from "@/lib/ai/plan";

// Ruta /api/plan con clientes falsos: comprueba qué se llama y qué se escribe, sin red.
type Rows = Record<string, unknown>;
let serverRows: Rows;
let rpc: ReturnType<typeof vi.fn>;
let updates: { table: string; payload: unknown }[];
let inserts: { table: string; payload: unknown }[];
let userId: string | null;
const callPlanModel = vi.fn<CallModel>();

function query(table: string, rows: Rows) {
  const builder: Record<string, unknown> = {
    select: () => builder,
    eq: () => builder,
    is: () => builder,
    limit: () => builder,
    maybeSingle: () => builder,
    then: (resolve: (v: unknown) => void) => resolve({ data: rows[table] ?? null, error: null }),
  };
  return builder;
}

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getClaims: async () => ({ data: userId ? { claims: { sub: userId } } : null }) },
    from: (table: string) => query(table, serverRows),
  }),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    rpc,
    from: (table: string) => ({
      update: (payload: unknown) => {
        updates.push({ table, payload });
        const chain = { eq: () => chain, then: (r: (v: unknown) => void) => r({ error: null }) };
        return chain;
      },
      insert: async (payload: unknown) => {
        inserts.push({ table, payload });
        return { error: null };
      },
    }),
  }),
}));
vi.mock("@/lib/catalog", () => ({
  exerciseCatalog: async () => CATALOG,
  sanitizeEquipment: (ids: string[], known: string[]) => ids.filter((id) => known.includes(id)),
}));
vi.mock("@/lib/ai/client", () => ({ callPlanModel: (...args: Parameters<CallModel>) => callPlanModel(...args) }));

const { POST } = await import("./route");

function goodReply(): Awaited<ReturnType<CallModel>> {
  // Cuerpo completo de 3 días: 6 huecos por sesión, el primer ejercicio libre de cada región.
  const regions = ["empuje_inferior", "traccion_inferior", "empuje_superior_horizontal", "traccion_superior_horizontal", "empuje_superior_vertical", "traccion_superior_vertical"];
  const session = { huecos: regions.map((r) => ({ ejercicio: CATALOG.find((e) => e.region === r)!.id })) };
  return { kind: "parsed", output: { sesiones: [session, session, session] }, inputTokens: 1000, outputTokens: 300 };
}

beforeEach(() => {
  userId = "u1";
  updates = [];
  inserts = [];
  callPlanModel.mockReset();
  rpc = vi.fn(async (fn: string) => (fn === "reserve_ai_call" ? { data: { ok: true, id: "call-1" }, error: null } : { data: "plan-1", error: null }));
  serverRows = {
    consents: [{ id: "c1" }],
    health_profile: { limitations: [] },
    onboarding_answers: { focus: "equilibrado", experience: "nunca", days_per_week: 3, minutes_per_session: 60, sports: [] },
    gym_profiles: { equipment_type_ids: ALL_EQUIPMENT_IDS },
  };
});

const post = async () => {
  const response = await POST();
  return { http: response.status, body: (await response.json()) as { status: string } };
};

describe("POST /api/plan", () => {
  it("sin sesión responde 401 sin llamar a nada", async () => {
    userId = null;
    expect(await post()).toEqual({ http: 401, body: { status: "sin_sesion" } });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("sin consentimiento vigente o sin cribado superado no llama a la IA", async () => {
    serverRows.consents = [];
    expect((await post()).body.status).toBe("sin_permiso");
    serverRows.consents = [{ id: "c1" }];
    serverRows.health_profile = null;
    expect((await post()).body.status).toBe("sin_permiso");
    expect(callPlanModel).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("con el límite agotado no llama a la API", async () => {
    rpc.mockResolvedValueOnce({ data: { ok: false, reason: "limite_alcanzado" }, error: null });
    expect((await post()).body.status).toBe("limite");
    expect(callPlanModel).not.toHaveBeenCalled();
  });

  it("una respuesta correcta se guarda con su llamada marcada como ok y deja el evento", async () => {
    callPlanModel.mockResolvedValue(goodReply());
    expect(await post()).toEqual({ http: 200, body: { status: "ok" } });
    const save = rpc.mock.calls.find(([fn]) => fn === "save_plan")!;
    expect(save[1]).toMatchObject({ p_user: "u1", p_ai_call: "call-1", p_input_tokens: 1000, p_output_tokens: 300 });
    expect(inserts).toEqual([{ table: "events", payload: { user_id: "u1", name: "plan_generado", step: "plan" } }]);
  });

  it("si la validación falla tras los reintentos no guarda plan y la llamada no queda como ok", async () => {
    const bad = goodReply();
    if (bad.kind === "parsed") bad.output.sesiones.pop();
    callPlanModel.mockResolvedValue(bad);
    expect((await post()).body.status).toBe("validacion");
    expect(rpc.mock.calls.some(([fn]) => fn === "save_plan")).toBe(false);
    expect(updates).toEqual([{ table: "ai_calls", payload: expect.objectContaining({ outcome: "validation_failed" }) }]);
  });

  it("un error de red devuelve conexión y no consume el límite", async () => {
    callPlanModel.mockResolvedValue({ kind: "connection" });
    expect((await post()).body.status).toBe("conexion");
    expect(updates[0].payload).toMatchObject({ outcome: "connection" });
  });
});
