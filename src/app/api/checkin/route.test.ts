import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CheckinCallModel, CheckinOutput } from "@/lib/ai/checkin";
import type { ActivePlan } from "@/lib/app/active-plan";
import { assemblePlan } from "@/lib/domain/plan-build";
import { buildTemplate } from "@/lib/domain/template";
import { ALL_EQUIPMENT_IDS, CATALOG } from "@/lib/domain/test-fixtures";

// Ruta /api/checkin con clientes falsos: qué se llama y qué se escribe, sin red (plan.md U8).
type Rows = Record<string, unknown>;
let serverRows: Rows;
let counts: Record<string, number>;
let rpc: ReturnType<typeof vi.fn>;
let updates: { table: string; payload: unknown }[];
let inserts: { table: string; payload: unknown }[];
let userId: string | null;
const callCheckinModel = vi.fn<CheckinCallModel>();

function query(table: string) {
  const builder: Record<string, unknown> = {
    select: () => builder,
    eq: () => builder,
    is: () => builder,
    gte: () => builder,
    limit: () => builder,
    maybeSingle: () => builder,
    then: (resolve: (v: unknown) => void) => resolve({ data: serverRows[table] ?? null, count: counts[table] ?? null, error: null }),
  };
  return builder;
}

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getClaims: async () => ({ data: userId ? { claims: { sub: userId } } : null }) },
    from: (table: string) => query(table),
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

// Plan activo de 3 días de cuerpo completo.
const template = buildTemplate(3, "equilibrado");
const built = assemblePlan({
  template,
  choices: template.sessions.map((s) => {
    const used: string[] = [];
    return s.slots.map((slot) => {
      const e = CATALOG.find((x) => x.region === slot.region && !used.includes(x.id))!;
      used.push(e.id);
      return e.id;
    });
  }),
  catalog: CATALOG,
  equipmentIds: ALL_EQUIPMENT_IDS,
  limitations: [],
  minutes: 45,
  focus: "equilibrado",
});
if (!built.ok) throw new Error("plan de prueba");
const activePlan: ActivePlan = {
  id: "11111111-1111-4111-8111-111111111111",
  version: 1,
  focus: "equilibrado",
  daysPerWeek: 3,
  template: "cuerpo_completo",
  source: "ia",
  createdAt: "2026-11-10T10:00:00Z",
  sessions: built.plan.sessions.map((s) => ({
    dayIndex: s.dayIndex,
    label: s.label,
    slots: s.slots.map((slot) => ({
      position: slot.position,
      pattern: slot.pattern,
      region: slot.region,
      exerciseId: slot.exerciseId,
      exerciseName: slot.exerciseId,
      gapReason: null,
      sets: slot.sets,
      repMin: slot.repMin,
      repMax: slot.repMax,
    })),
  })),
};
vi.mock("@/lib/app/active-plan", () => ({ loadActivePlan: async () => activePlan }));
vi.mock("@/lib/ai/client", () => ({ callCheckinModel: (...args: Parameters<CheckinCallModel>) => callCheckinModel(...args) }));

const { POST } = await import("./route");

const good: CheckinOutput = { cambios: [], explicacion: "Semana redonda: mantenemos el plan." };
const parsed = (output: CheckinOutput) => ({ kind: "parsed" as const, output, inputTokens: 1200, outputTokens: 250 });

beforeEach(() => {
  userId = "u1";
  updates = [];
  inserts = [];
  callCheckinModel.mockReset();
  rpc = vi.fn(async () => ({ data: { ok: true, id: "call-1" }, error: null }));
  serverRows = {
    consents: [{ id: "c1" }],
    health_profile: { limitations: [] },
    onboarding_answers: { focus: "equilibrado", minutes_per_session: 45, sports: [] },
    gym_profiles: { equipment_type_ids: ALL_EQUIPMENT_IDS },
    account_status: { trial_ends_at: "2099-01-01T00:00:00Z", subscription_status: null },
    checkins: null,
    discomfort_marks: [],
  };
  // Las 3 sesiones de la semana hechas: el check-in toca cualquier día (diseño D10).
  counts = { workout_sessions: 3 };
});

afterEach(() => vi.useRealTimers());

const post = async (body: unknown = { sensacion: 3, fatiga: 4 }) => {
  const response = await POST(new Request("http://localhost/api/checkin", { method: "POST", body: JSON.stringify(body) }));
  return { http: response.status, body: (await response.json()) as { status: string } };
};

describe("POST /api/checkin", () => {
  it("sin sesión responde 401 sin llamar a la IA", async () => {
    userId = null;
    expect(await post()).toEqual({ http: 401, body: { status: "sin_sesion" } });
    expect(callCheckinModel).not.toHaveBeenCalled();
  });

  it("solo acepta las dos escalas de 1 a 5 (sin texto libre)", async () => {
    expect((await post({ sensacion: 7, fatiga: 2 })).body.status).toBe("no_valido");
    expect((await post({ sensacion: "me duele la rodilla", fatiga: 2 })).body.status).toBe("no_valido");
    expect(callCheckinModel).not.toHaveBeenCalled();
  });

  it("un usuario sin premium recibe el estado bloqueado sin llamar a la IA ni reservar", async () => {
    serverRows.account_status = { trial_ends_at: "2020-01-01T00:00:00Z", subscription_status: null };
    expect(await post()).toEqual({ http: 403, body: { status: "solo_premium" } });
    expect(callCheckinModel).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("sin consentimiento vigente no llama a la IA", async () => {
    serverRows.consents = [];
    expect((await post()).body.status).toBe("sin_permiso");
    expect(callCheckinModel).not.toHaveBeenCalled();
  });

  it("un segundo check-in de la misma semana devuelve el guardado sin llamar a la IA", async () => {
    serverRows.checkins = { id: "k1", feeling: 3, fatigue: 3, applied: null, adjustment: {} };
    expect(await post()).toEqual({ http: 200, body: { status: "ok" } });
    expect(callCheckinModel).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("a mitad de semana con sesiones pendientes no toca y no llama a la IA", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-18T10:00:00Z"));
    counts = { workout_sessions: 1 };
    expect((await post()).body.status).toBe("no_toca");
    expect(callCheckinModel).not.toHaveBeenCalled();
  });

  it("con el límite semanal usado no llama a la IA", async () => {
    rpc = vi.fn(async () => ({ data: { ok: false, reason: "limite_semanal" }, error: null }));
    expect((await post()).body.status).toBe("limite");
    expect(callCheckinModel).not.toHaveBeenCalled();
  });

  it("un ajuste válido se guarda en checkins (escribe el servidor), cierra la llamada como ok y registra el evento", async () => {
    callCheckinModel.mockResolvedValue(parsed(good));
    expect(await post({ sensacion: 2, fatiga: 5 })).toEqual({ http: 200, body: { status: "ok" } });
    expect(rpc).toHaveBeenCalledWith("reserve_ai_call", expect.objectContaining({ p_user: "u1", p_kind: "checkin", p_period_limit: 1 }));
    const checkin = inserts.find((i) => i.table === "checkins")?.payload as Record<string, unknown>;
    expect(checkin).toMatchObject({ user_id: "u1", feeling: 2, fatigue: 5, applied: null });
    expect(checkin.adjustment).toMatchObject({ v: 1, basePlanId: activePlan.id, titulo: "Tu plan sigue igual" });
    expect(updates).toEqual([{ table: "ai_calls", payload: expect.objectContaining({ outcome: "ok", input_tokens: 1200, output_tokens: 250 }) }]);
    expect(inserts.find((i) => i.table === "events")?.payload).toEqual({ user_id: "u1", name: "checkin_hecho" });
  });

  it("sin un ajuste válido tras los reintentos no guarda nada y la llamada queda como validation_failed", async () => {
    callCheckinModel.mockResolvedValue(parsed({ cambios: [{ sesion: 9, hueco: 1, series: 3, ejercicio: null, motivo: "x" }], explicacion: "x" }));
    expect((await post()).body.status).toBe("validacion");
    expect(inserts.filter((i) => i.table === "checkins")).toEqual([]);
    expect(updates).toEqual([{ table: "ai_calls", payload: expect.objectContaining({ outcome: "validation_failed" }) }]);
  });

  it("un fallo de red responde conexión y no consume el límite", async () => {
    callCheckinModel.mockResolvedValue({ kind: "connection" });
    expect(await post()).toEqual({ http: 503, body: { status: "conexion" } });
    expect(updates).toEqual([{ table: "ai_calls", payload: expect.objectContaining({ outcome: "connection" }) }]);
  });
});
