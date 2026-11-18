import { beforeEach, describe, expect, it, vi } from "vitest";

// Clientes de Supabase falsos: registran cada operación para comprobar qué se escribe y con qué
// user_id. Sin red.
type Op = { table: string; op: string; payload?: unknown; filters: [string, unknown][] };
type Result = { data?: unknown; error?: unknown };

function fakeDb(responses: Record<string, Result> = {}) {
  const ops: Op[] = [];
  const rpcs: { fn: string; args: unknown }[] = [];
  const from = (table: string) => {
    const op: Op = { table, op: "", filters: [] };
    const write = (name: string) => (payload?: unknown) => {
      op.op = name;
      op.payload = payload;
      return builder;
    };
    const filter = (column: string, value: unknown) => {
      op.filters.push([column, value]);
      return builder;
    };
    const builder: Record<string, unknown> = {
      select: () => {
        if (!op.op) op.op = "select";
        return builder;
      },
      insert: write("insert"),
      upsert: write("upsert"),
      update: write("update"),
      delete: write("delete"),
      eq: filter,
      is: filter,
      in: filter,
      limit: () => builder,
      maybeSingle: () => builder,
      then: (resolve: (value: unknown) => void) => {
        ops.push(op);
        const r = responses[`${table}.${op.op}`] ?? {};
        resolve({ data: r.data ?? null, error: r.error ?? null });
      },
    };
    return builder;
  };
  const rpc = async (fn: string, args: unknown) => {
    rpcs.push({ fn, args });
    return { data: null, error: null };
  };
  return { from, rpc, ops, rpcs };
}

let server: ReturnType<typeof fakeDb> & { auth: Record<string, ReturnType<typeof vi.fn>> };
let admin: ReturnType<typeof fakeDb> & { auth: { admin: Record<string, ReturnType<typeof vi.fn>> } };

function setup({ userId = null as string | null, serverResponses = {}, adminResponses = {} } = {}) {
  server = Object.assign(fakeDb(serverResponses), {
    auth: {
      getClaims: vi.fn(async () => ({ data: userId ? { claims: { sub: userId } } : null, error: null })),
      signUp: vi.fn(),
      resend: vi.fn(async () => ({ error: null })),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(async () => ({ error: null })),
    },
  });
  admin = Object.assign(
    fakeDb({
      "equipment_types.select": { data: [{ id: "prensa_piernas" }, { id: "jalon" }, { id: "mancuernas" }] },
      "activity_types.select": { data: [{ id: "padel" }, { id: "correr" }] },
      ...adminResponses,
    }),
    { auth: { admin: { deleteUser: vi.fn(async () => ({ error: null })) } } },
  );
}

vi.mock("next/headers", () => ({ headers: async () => new Headers({ origin: "https://buddy.test" }) }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => server }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => admin }));

const actions = await import("./actions");

const answers = {
  focus: "fuerza",
  experience: "menos_6_meses",
  daysPerWeek: 3,
  minutesPerSession: 60,
  sports: ["padel"],
  gymPreset: "basico",
  equipmentTypeIds: ["prensa_piernas", "jalon"],
};

const registro = (overrides: Record<string, unknown> = {}) => ({
  email: "persona@example.com",
  password: "una-clave-larga",
  adult: true,
  answers,
  events: [{ name: "wizard_vista", step: "foco", at: new Date().toISOString() }],
  ...overrides,
});

const allNo = {
  cardiaco: false,
  dolor_toracico: false,
  mareos: false,
  cronica: false,
  medicacion: false,
  articular: false,
  supervision: false,
  embarazo: false,
};

const writesTo = (db: { ops: Op[] }, table: string) =>
  db.ops.filter((o) => o.table === table && ["insert", "upsert", "update"].includes(o.op));

beforeEach(() => setup());

describe("registro", () => {
  it("sin la casilla +18 se rechaza con error en línea y no crea cuenta", async () => {
    const result = await actions.registrarse(registro({ adult: false }));
    expect(result).toEqual({ ok: false, errors: { adult: expect.any(String) } });
    expect(server.auth.signUp).not.toHaveBeenCalled();
  });

  it("guarda las respuestas previas con el user.id de signUp, nunca con uno de la entrada", async () => {
    server.auth.signUp.mockResolvedValue({ data: { user: { id: "nuevo", identities: [{ id: "i" }] } }, error: null });
    const result = await actions.registrarse(registro({ userId: "otro", user_id: "otro" }));
    expect(server.auth.signUp).toHaveBeenCalledWith(
      expect.objectContaining({ options: { emailRedirectTo: "https://buddy.test/auth/confirm?next=/consentimiento" } }),
    );

    expect(result).toEqual({ ok: true });
    const [answersInsert] = writesTo(admin, "onboarding_answers");
    expect(answersInsert).toMatchObject({
      op: "insert",
      payload: { user_id: "nuevo", focus: "fuerza", experience: "menos_6_meses", days_per_week: 3, minutes_per_session: 60, sports: ["padel"] },
    });
    expect(writesTo(admin, "gym_profiles")[0]).toMatchObject({
      op: "insert",
      payload: { user_id: "nuevo", preset: "basico", equipment_type_ids: ["prensa_piernas", "jalon"] },
    });
    const events = writesTo(admin, "events")[0].payload as { user_id: string; name: string }[];
    expect(events.every((e) => e.user_id === "nuevo")).toBe(true);
    expect(events.map((e) => e.name)).toEqual(["wizard_vista", "registro"]);
    expect(JSON.stringify(admin.ops)).not.toContain("otro");
  });

  it("con un email que ya existe responde lo mismo y no escribe nada", async () => {
    server.auth.signUp.mockResolvedValue({ data: { user: { id: "ofuscado", identities: [] } }, error: null });
    expect(await actions.registrarse(registro())).toEqual({ ok: true });
    expect(admin.ops.filter((o) => o.op !== "select")).toEqual([]);
  });

  it("rechaza equipo que no está en el catálogo", async () => {
    const result = await actions.registrarse(registro({ answers: { ...answers, equipmentTypeIds: ["maquina_inventada"] } }));
    expect(result.ok).toBe(false);
    expect(server.auth.signUp).not.toHaveBeenCalled();
  });

  it("no acepta un campo de salud colado en las respuestas", async () => {
    server.auth.signUp.mockResolvedValue({ data: { user: { id: "nuevo", identities: [{ id: "i" }] } }, error: null });
    await actions.registrarse(registro({ answers: { ...answers, limitations: ["rodilla"] } }));
    expect(JSON.stringify(admin.ops)).not.toContain("rodilla");
  });
});

describe("acciones con sesión", () => {
  it("cada acción del wizard, salvo el registro, se rechaza sin sesión", async () => {
    const calls = [
      actions.darConsentimiento({ accepted: true }),
      actions.guardarSeguridad({ limitations: [], answers: allNo }),
      actions.registrarEvento({ name: "wizard_vista", step: "resumen" }),
      actions.actualizarRespuestas({ focus: "musculo" }),
      actions.borrarCuenta(),
    ];
    for (const result of await Promise.all(calls)) expect(result).toEqual({ ok: false, error: "sin_sesion" });
    expect(server.ops.filter((o) => o.op !== "select")).toEqual([]);
    expect(admin.ops).toEqual([]);
    expect(admin.auth.admin.deleteUser).not.toHaveBeenCalled();
  });

  it("guardar limitaciones sin consentimiento vigente se rechaza", async () => {
    setup({ userId: "u1", serverResponses: { "consents.select": { data: [] } } });
    const result = await actions.guardarSeguridad({ limitations: ["rodilla"], answers: allNo });
    expect(result).toEqual({ ok: false, error: "sin_consentimiento" });
    expect(writesTo(admin, "health_profile")).toEqual([]);
  });

  it("un «Sí» de riesgo bloquea, suma al contador diario y no escribe salud ni eventos", async () => {
    setup({ userId: "u1", serverResponses: { "consents.select": { data: [{ id: "c1" }] } } });
    const result = await actions.guardarSeguridad({ limitations: ["rodilla"], answers: { ...allNo, cardiaco: true } });

    expect(result).toEqual({ ok: true, status: "bloqueado" });
    expect(admin.rpcs).toEqual([{ fn: "bump_daily_counter", args: { p_metric: "cribado_bloqueado" } }]);
    expect(writesTo(admin, "health_profile")).toEqual([]);
    expect(writesTo(admin, "events")).toEqual([]);
    expect(JSON.stringify(admin.rpcs)).not.toContain("u1");
  });

  it("el «Sí» articular sin zona pide marcarla y no guarda nada", async () => {
    setup({ userId: "u1", serverResponses: { "consents.select": { data: [{ id: "c1" }] } } });
    const result = await actions.guardarSeguridad({ limitations: [], answers: { ...allNo, articular: true } });
    expect(result).toEqual({ ok: true, status: "requiere_zona" });
    expect(writesTo(admin, "health_profile")).toEqual([]);
  });

  it("con todo respondido y apto guarda limitaciones y resultado con el user_id de la sesión", async () => {
    setup({ userId: "u1", serverResponses: { "consents.select": { data: [{ id: "c1" }] } } });
    const result = await actions.guardarSeguridad({ limitations: ["rodilla", "hombro"], answers: { ...allNo, articular: true } });
    expect(result).toEqual({ ok: true, status: "apto" });
    const [write] = writesTo(admin, "health_profile");
    expect(write).toMatchObject({ op: "upsert", payload: { user_id: "u1", limitations: ["rodilla", "hombro"] } });
    // Del cribado se guarda el resultado, nunca las respuestas.
    expect(JSON.stringify(write.payload)).not.toMatch(/articular|cardiaco/);
  });

  it("un evento fuera de la lista cerrada se rechaza", async () => {
    setup({ userId: "u1" });
    expect(await actions.registrarEvento({ name: "cribado_bloqueado", step: "seguridad" })).toEqual({ ok: false, error: "no_valido" });
    expect(admin.ops).toEqual([]);
  });

  it("el consentimiento se guarda una vez con la casilla marcada", async () => {
    setup({ userId: "u1", serverResponses: { "consents.select": { data: [] } } });
    expect(await actions.darConsentimiento({ accepted: false })).toEqual({ ok: false, error: "no_valido" });
    expect(await actions.darConsentimiento({ accepted: true })).toEqual({ ok: true });
    expect(writesTo(server, "consents")).toHaveLength(1);
  });

  it("borrar la cuenta usa el user_id de la sesión", async () => {
    setup({ userId: "u1" });
    expect(await actions.borrarCuenta()).toEqual({ ok: true });
    expect(admin.auth.admin.deleteUser).toHaveBeenCalledWith("u1");
  });
});
