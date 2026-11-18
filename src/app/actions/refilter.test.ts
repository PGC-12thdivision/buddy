import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ActivePlan } from "@/lib/app/active-plan";
import { ALL_EQUIPMENT_IDS, CATALOG } from "@/lib/domain/test-fixtures";

let userId: string | null = "u1";
let limitations: string[] = [];
let gymError: { code: string } | null = null;
let plan: ActivePlan | null;
const rpc = vi.fn(async () => ({ data: "plan-2", error: null }));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getClaims: async () => ({ data: userId ? { claims: { sub: userId } } : null }) },
    from: (table: string) => {
      const rows: Record<string, unknown> = {
        health_profile: { limitations },
        gym_profiles: gymError ? null : { equipment_type_ids: ALL_EQUIPMENT_IDS },
        onboarding_answers: { minutes_per_session: 60 },
      };
      const error = table === "gym_profiles" ? gymError : null;
      const builder = { select: () => builder, eq: () => builder, maybeSingle: async () => ({ data: rows[table] ?? null, error }) };
      return builder;
    },
  }),
}));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ rpc }) }));
vi.mock("@/lib/catalog", () => ({
  exerciseCatalog: async () => CATALOG,
  sanitizeEquipment: (ids: string[]) => ids,
}));
vi.mock("@/lib/app/active-plan", () => ({ loadActivePlan: async () => plan }));

const { refiltrarPlan } = await import("./refilter");

const slot = (position: number, exerciseId: string) => {
  const e = CATALOG.find((x) => x.id === exerciseId)!;
  return { position, pattern: e.pattern, region: e.region, exerciseId, exerciseName: exerciseId, gapReason: null, sets: 3, repMin: 8, repMax: 12 };
};

beforeEach(() => {
  userId = "u1";
  limitations = [];
  gymError = null;
  rpc.mockClear();
  plan = {
    id: "p1",
    version: 1,
    focus: "equilibrado",
    daysPerWeek: 3,
    template: "cuerpo_completo",
    source: "ia",
    createdAt: "2026-11-18T10:00:00Z",
    sessions: [{ dayIndex: 0, label: "Cuerpo completo", slots: [slot(0, "sentadilla_barra"), slot(1, "peso_muerto_rumano")] }],
  };
});

describe("refiltrarPlan", () => {
  it("sin sesión se rechaza sin tocar nada", async () => {
    userId = null;
    expect(await refiltrarPlan()).toEqual({ ok: false, error: "sin_sesion" });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("con una limitación nueva guarda una versión nueva sin ningún ejercicio que cargue la zona", async () => {
    limitations = ["rodilla"];
    const result = await refiltrarPlan();
    expect(result.ok).toBe(true);
    const [fn, args] = rpc.mock.calls[0] as unknown as [string, { p_user: string; p_ai_call: null; p_plan: { source: string; sessions: { slots: { exercise_id: string | null; gap_reason: string | null }[] }[] } }];
    expect(fn).toBe("save_plan");
    expect(args).toMatchObject({ p_user: "u1", p_ai_call: null, p_plan: { source: "refiltrado" } });
    const byId = new Map(CATALOG.map((e) => [e.id, e]));
    for (const s of args.p_plan.sessions[0].slots) {
      if (s.exercise_id) expect(byId.get(s.exercise_id)!.joints).not.toContain("rodilla");
      else expect(s.gap_reason).toMatch(/^sin_alternativa_/);
    }
  });

  it("si falla la lectura del gimnasio no vacía el plan: no guarda nada", async () => {
    limitations = ["rodilla"];
    gymError = { code: "PGRST000" };
    expect(await refiltrarPlan()).toEqual({ ok: false, error: "fallo" });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("si nada cambia no guarda una versión nueva", async () => {
    plan!.sessions[0].slots = [slot(0, "prensa")];
    expect(await refiltrarPlan()).toEqual({ ok: true, changed: 0, holes: 0 });
    expect(rpc).not.toHaveBeenCalled();
  });
});
