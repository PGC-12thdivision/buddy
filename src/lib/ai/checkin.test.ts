import { describe, expect, it, vi } from "vitest";
import { assemblePlan, type BuiltSession } from "@/lib/domain/plan-build";
import { PROMPT_FIELDS } from "@/lib/domain/prompt-fields";
import { buildTemplate } from "@/lib/domain/template";
import { ALL_EQUIPMENT_IDS, CATALOG } from "@/lib/domain/test-fixtures";
import type { Joint } from "@/lib/domain/types";
import { availableExercises } from "@/lib/domain/exclusion";
import { validateVolume } from "@/lib/domain/volume";
import {
  applyCheckinOutput,
  checkinTitle,
  CHECKIN_SYSTEM_PROMPT,
  revalidateStoredAdjustment,
  runCheckin,
  toStoredAdjustment,
  type CheckinCallModel,
  type CheckinOutput,
  type CheckinReply,
} from "./checkin";
import { MAX_ATTEMPTS } from "./plan";

// Check-in del coach (plan.md U8) con el modelo simulado: sin red.

const PLAN_ID = "11111111-1111-4111-8111-111111111111";
const template = buildTemplate(3, "equilibrado");

// Plan de 3 días de cuerpo completo: en cada hueco, el primer ejercicio libre de su región.
function basePlan(limitations: Joint[] = []): BuiltSession[] {
  const choices = template.sessions.map((s) => {
    const used: string[] = [];
    return s.slots.map((slot) => {
      const e = CATALOG.find((x) => x.region === slot.region && !used.includes(x.id))!;
      used.push(e.id);
      return e.id;
    });
  });
  const built = assemblePlan({ template, choices, catalog: CATALOG, equipmentIds: ALL_EQUIPMENT_IDS, limitations, minutes: 45, focus: "equilibrado" });
  if (!built.ok) throw new Error(built.reason);
  return built.plan.sessions;
}

const profile = { focus: "equilibrado" as const, daysPerWeek: 3, minutesPerSession: 45, sports: ["padel"] };
const scales = { sensacion: 4, fatiga: 2 };
const parsed = (output: CheckinOutput): CheckinReply => ({ kind: "parsed", output, inputTokens: 1500, outputTokens: 300 });
const noChange: CheckinOutput = { cambios: [], explicacion: "Buena semana: mantenemos el plan tal cual." };

const run = (callModel: CheckinCallModel, opts: { base?: BuiltSession[]; limitations?: Joint[]; molestias?: string[] } = {}) =>
  runCheckin({
    model: "claude-sonnet-5-5",
    callModel,
    base: opts.base ?? basePlan(opts.limitations),
    profile,
    scales,
    catalog: CATALOG,
    equipmentIds: ALL_EQUIPMENT_IDS,
    limitations: opts.limitations ?? [],
    molestias: opts.molestias ?? [],
  });

const ids = (sessions: readonly BuiltSession[]) => sessions.flatMap((s) => s.slots.map((slot) => slot.exerciseId));
const slotOf = (sessions: readonly BuiltSession[], id: string) => {
  for (const [i, s] of sessions.entries()) for (const slot of s.slots) if (slot.exerciseId === id) return { sesion: i + 1, hueco: slot.position + 1, slot };
  throw new Error(`sin ${id}`);
};

describe("runCheckin", () => {
  it("una respuesta válida da un ajuste con título, explicación y un intento ok", async () => {
    const base = basePlan();
    const { sesion, hueco } = slotOf(base, "press_pecho_maquina");
    const output: CheckinOutput = {
      cambios: [{ sesion, hueco, series: 2, ejercicio: null, motivo: "Fatiga en el pecho: una serie menos." }],
      explicacion: "Bajamos un poco el pecho para que llegues fresco.",
    };
    const result = await run(vi.fn(async () => parsed(output)), { base });
    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.attempts).toEqual([{ outcome: "ok", inputTokens: 1500, outputTokens: 300 }]);
    expect(result.proposal.titulo).toBe("Menos pecho esta semana");
    expect(result.proposal.cambios).toEqual([
      expect.objectContaining({ antes: "press_pecho_maquina", despues: "press_pecho_maquina", seriesDespues: 2, origen: "coach" }),
    ]);
  });

  it("un ajuste que deja un grupo por encima de 20 series se rechaza y se reintenta", async () => {
    const base = basePlan();
    // Todos los huecos de pierna a 6 series: glúteos muy por encima de 20 a la semana.
    const legs = base.flatMap((s, i) =>
      s.slots.filter((slot) => slot.region.endsWith("_inferior")).map((slot) => ({ sesion: i + 1, hueco: slot.position + 1 })),
    );
    const tooMuch: CheckinOutput = {
      cambios: legs.slice(0, 6).map((l) => ({ ...l, series: 6, ejercicio: null, motivo: "Más pierna." })),
      explicacion: "Subimos pierna.",
    };
    const callModel = vi.fn<CheckinCallModel>().mockResolvedValueOnce(parsed(tooMuch)).mockResolvedValueOnce(parsed(noChange));
    const result = await run(callModel, { base });
    expect(callModel).toHaveBeenCalledTimes(2);
    expect(result.attempts.map((a) => [a.outcome, a.reason])).toEqual([
      ["validation_failed", "topes"],
      ["ok", undefined],
    ]);
  });

  it("tras 2 reintentos sin un ajuste válido devuelve error de validación", async () => {
    const bad: CheckinOutput = { cambios: [{ sesion: 9, hueco: 1, series: 3, ejercicio: null, motivo: "x" }], explicacion: "x" };
    const callModel = vi.fn(async () => parsed(bad));
    const result = await run(callModel);
    expect(result.status).toBe("validation_failed");
    expect(callModel).toHaveBeenCalledTimes(MAX_ATTEMPTS);
  });

  it("un texto que habla de kilos se rechaza: las cargas solo las explican las reglas", async () => {
    const kg: CheckinOutput = { cambios: [], explicacion: "Sube la prensa a 50 kg." };
    const callModel = vi.fn<CheckinCallModel>().mockResolvedValueOnce(parsed(kg)).mockResolvedValueOnce(parsed(noChange));
    const result = await run(callModel);
    expect(result.attempts[0]).toMatchObject({ outcome: "validation_failed", reason: "habla_de_cargas" });
    expect(result.status).toBe("ok");
  });

  it("un error de red no reintenta y no cuenta tokens", async () => {
    const callModel = vi.fn(async (): Promise<CheckinReply> => ({ kind: "connection" }));
    const result = await run(callModel);
    expect(result).toEqual({ status: "connection", attempts: [{ outcome: "connection", inputTokens: 0, outputTokens: 0 }] });
    expect(callModel).toHaveBeenCalledTimes(1);
  });

  it("rechazo del modelo y respuesta vacía se distinguen", async () => {
    expect((await run(vi.fn(async (): Promise<CheckinReply> => ({ kind: "refused", inputTokens: 10, outputTokens: 0 })))).status).toBe("refused");
    expect((await run(vi.fn(async (): Promise<CheckinReply> => ({ kind: "empty", inputTokens: 10, outputTokens: 0 })))).status).toBe("empty");
  });
});

describe("reglas sobre la salida de la IA", () => {
  const rules = (limitations: Joint[] = [], molestias: string[] = []) => ({ catalog: CATALOG, equipmentIds: ALL_EQUIPMENT_IDS, limitations, molestias });

  it("una sustitución por un ejercicio que carga una zona limitada se descarta (nunca se aplica)", () => {
    const base = basePlan(["rodilla"]);
    const { sesion, hueco } = slotOf(base, "peso_muerto_rumano");
    const output: CheckinOutput = {
      cambios: [{ sesion, hueco, series: null, ejercicio: "curl_femoral", motivo: "Variamos el femoral." }],
      explicacion: "Cambiamos un ejercicio de pierna.",
    };
    const result = applyCheckinOutput(base, output, rules(["rodilla"]));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(ids(result.plan)).not.toContain("curl_femoral");
    expect(result.descartados).toBe(1);
  });

  it("los ejercicios con Molestia esta semana se sustituyen de forma determinista, aunque la IA no cambie nada", () => {
    const base = basePlan();
    const result = applyCheckinOutput(base, noChange, rules([], ["sentadilla_barra"]));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(ids(result.plan)).not.toContain("sentadilla_barra");
    expect(ids(result.plan)).toContain("prensa");
    expect(result.cambios.every((c) => c.origen === "reglas" && c.motivo === null)).toBe(true);
  });

  it("la IA no puede volver a meter un ejercicio con Molestia", () => {
    const base = basePlan();
    const { sesion, hueco } = slotOf(base, "sentadilla_barra");
    const output: CheckinOutput = { cambios: [{ sesion, hueco, series: null, ejercicio: "prensa", motivo: "Variamos." }], explicacion: "Cambio." };
    const result = applyCheckinOutput(base, output, rules([], ["prensa"]));
    expect(result.ok && ids(result.plan).includes("prensa")).toBe(false);
  });

  it("un ID de otra región o fuera del equipo se rechaza", () => {
    const base = basePlan();
    const { sesion, hueco } = slotOf(base, "sentadilla_barra");
    const wrongRegion: CheckinOutput = { cambios: [{ sesion, hueco, series: null, ejercicio: "jalon_pecho", motivo: "x" }], explicacion: "x" };
    expect(applyCheckinOutput(base, wrongRegion, rules())).toEqual({ ok: false, reason: "region_incorrecta" });
    const noEquipment = { ...rules(), equipmentIds: ALL_EQUIPMENT_IDS.filter((e) => e !== "prensa_piernas") };
    const offCatalog: CheckinOutput = { cambios: [{ sesion, hueco, series: null, ejercicio: "prensa", motivo: "x" }], explicacion: "x" };
    expect(applyCheckinOutput(base, offCatalog, noEquipment)).toEqual({ ok: false, reason: "id_fuera_de_catalogo" });
  });

  it("menos de 2 series en un ejercicio se rechaza", () => {
    const base = basePlan();
    const { sesion, hueco } = slotOf(base, "jalon_pecho");
    const output: CheckinOutput = { cambios: [{ sesion, hueco, series: 1, ejercicio: null, motivo: "x" }], explicacion: "x" };
    expect(applyCheckinOutput(base, output, rules())).toEqual({ ok: false, reason: "series_fuera_de_rango" });
  });
});

describe("prompt del check-in (KTD19, D29)", () => {
  async function promptFor(limitations: Joint[], molestias: string[]) {
    const callModel = vi.fn<CheckinCallModel>(async () => parsed(noChange));
    await run(callModel, { base: basePlan(), limitations, molestias });
    return callModel.mock.calls[0][0];
  }

  it("es idéntico, byte a byte, con o sin limitaciones y molestias", async () => {
    const sin = await promptFor([], []);
    const con = await promptFor(["rodilla", "hombro"], ["sentadilla_barra"]);
    expect(con.user).toBe(sin.user);
    expect(con.system).toBe(sin.system);
    expect(sin.system).toBe(CHECKIN_SYSTEM_PROMPT);
  });

  it("solo lleva campos permitidos y el plan con IDs y números: sin texto libre ni datos de salud", async () => {
    const { user } = await promptFor(["rodilla"], ["sentadilla_barra"]);
    const [datos, plan] = user.replace("Datos:\n", "").split("\n\nPlan actual:\n");
    const payload = JSON.parse(datos);
    expect(Object.keys(payload).every((k) => (PROMPT_FIELDS as readonly string[]).includes(k))).toBe(true);
    expect(payload.escalas).toEqual({ sensacion: 4, fatiga: 2 });
    for (const forbidden of ["limitaciones", "cribado", "molestia", "Molestia", "articula"]) expect(user).not.toContain(forbidden);
    const sessions = JSON.parse(plan) as { sesion: number; huecos: Record<string, unknown>[] }[];
    for (const s of sessions) {
      expect(Object.keys(s).sort()).toEqual(["huecos", "sesion"]);
      for (const h of s.huecos) {
        expect(Object.keys(h).sort()).toEqual(["ejercicio", "hueco", "series"]);
        expect(CATALOG.some((e) => e.id === h.ejercicio)).toBe(true);
      }
    }
  });
});

describe("título (diseño D17)", () => {
  it("lo monta el código con el grupo que más cambia; sin cambios, dice que sigue igual", () => {
    const base = basePlan();
    expect(checkinTitle(base, base, 0, CATALOG)).toBe("Tu plan sigue igual");
    const more = base.map((s) => ({ ...s, slots: s.slots.map((slot) => ({ ...slot, sets: slot.region.startsWith("traccion_superior") ? slot.sets + 1 : slot.sets })) }));
    expect(checkinTitle(base, more, 6, CATALOG)).toBe("Más espalda esta semana");
  });
});

describe("Aplicar: revalidación del ajuste guardado", () => {
  const rules = (limitations: Joint[] = [], molestias: string[] = []) => ({ catalog: CATALOG, equipmentIds: ALL_EQUIPMENT_IDS, limitations, molestias });
  const stored = (plan: BuiltSession[]) => toStoredAdjustment(PLAN_ID, { titulo: "Tu plan sigue igual", explicacion: "Bien.", cambios: [], descartados: 0, plan });

  it("un ajuste válido sobre el plan activo se acepta", () => {
    const result = revalidateStoredAdjustment(stored(basePlan()), PLAN_ID, rules());
    expect(result.ok).toBe(true);
  });

  it("una fila con otra forma (no la escribió el servidor) nunca se aplica", () => {
    expect(revalidateStoredAdjustment({ plan: "todo" }, PLAN_ID, rules())).toEqual({ ok: false, reason: "no_valido" });
    expect(revalidateStoredAdjustment(null, PLAN_ID, rules())).toEqual({ ok: false, reason: "no_valido" });
    const unknown = stored(basePlan());
    unknown.plan[0].slots[0].exerciseId = "inventado";
    expect(revalidateStoredAdjustment(unknown, PLAN_ID, rules())).toEqual({ ok: false, reason: "no_valido" });
  });

  it("si el plan activo cambió desde el check-in, no se aplica", () => {
    expect(revalidateStoredAdjustment(stored(basePlan()), "22222222-2222-4222-8222-222222222222", rules())).toEqual({ ok: false, reason: "desfasado" });
  });

  it("vuelve a pasar la exclusión: un ejercicio que carga una zona limitada hoy sale del plan", () => {
    const result = revalidateStoredAdjustment(stored(basePlan()), PLAN_ID, rules(["rodilla"]));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const knee = CATALOG.filter((e) => e.joints.includes("rodilla")).map((e) => e.id);
    expect(ids(result.plan).some((id) => id !== null && knee.includes(id))).toBe(false);
  });

  it("vuelve a pasar los topes: ningún grupo por encima de 20 series", () => {
    const heavy = basePlan().map((s) => ({ ...s, slots: s.slots.map((slot) => ({ ...slot, sets: 6 })) }));
    const result = revalidateStoredAdjustment(stored(heavy), PLAN_ID, rules());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const issues = validateVolume(
      { sessions: result.plan.map((s) => ({ slots: s.slots })) },
      CATALOG,
      availableExercises(CATALOG, ALL_EQUIPMENT_IDS, []),
    ).issues;
    expect(issues.filter((i) => i.code === "techo_series_grupo")).toEqual([]);
  });
});
