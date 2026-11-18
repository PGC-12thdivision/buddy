import { describe, expect, it } from "vitest";
import { assemblePlan, setsPerSlot } from "./plan-build";
import { buildTemplate } from "./template";
import { ALL_EQUIPMENT_IDS, CATALOG } from "./test-fixtures";
import { validateVolume } from "./volume";
import { availableExercises } from "./exclusion";
import type { Exercise } from "./types";

const byRegion = (region: string, skip: string[] = []) => CATALOG.find((e) => e.region === region && !skip.includes(e.id))!;

// Elección "perfecta" de la IA: para cada hueco, el primer ejercicio de su región no usado en la sesión.
function choose(template: ReturnType<typeof buildTemplate>) {
  return template.sessions.map((s) => {
    const used: string[] = [];
    return s.slots.map((slot) => {
      const e = byRegion(slot.region, used);
      used.push(e.id);
      return e.id;
    });
  });
}

const ctx = (overrides: Partial<Parameters<typeof assemblePlan>[0]> = {}) => {
  const template = buildTemplate(3, "equilibrado");
  return {
    template,
    choices: choose(template),
    catalog: CATALOG,
    equipmentIds: ALL_EQUIPMENT_IDS,
    limitations: [],
    minutes: 60,
    focus: "equilibrado" as const,
    ...overrides,
  };
};

describe("setsPerSlot", () => {
  it("reparte las series según los minutos: 30 min y 6 huecos dan 2 series", () => {
    expect(setsPerSlot(6, 30, "equilibrado")).toBe(2);
    expect(setsPerSlot(6, 45, "equilibrado")).toBe(3);
    expect(setsPerSlot(4, 60, "equilibrado")).toBe(4);
  });

  it("nunca baja de 2 ni pasa de 4 (5 en Más músculo)", () => {
    expect(setsPerSlot(10, 30, "equilibrado")).toBe(2);
    expect(setsPerSlot(4, 75, "equilibrado")).toBe(4);
    expect(setsPerSlot(4, 75, "musculo")).toBe(5);
  });
});

describe("assemblePlan", () => {
  it("una elección correcta da un plan que pasa el validador de topes", () => {
    const result = assemblePlan(ctx());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const plan = { sessions: result.plan.sessions.map((s) => ({ slots: s.slots })) };
    const available = availableExercises(CATALOG, ALL_EQUIPMENT_IDS, []);
    expect(validateVolume(plan, CATALOG, available).ok).toBe(true);
    expect(result.plan.sessions).toHaveLength(3);
    expect(result.plan.sessions[0].slots[0]).toMatchObject({ region: "empuje_inferior", sets: expect.any(Number), repMin: 8, repMax: 12 });
  });

  it("un ID fuera del catálogo de equipo del usuario se rechaza (catálogo cerrado)", () => {
    const base = ctx();
    const choices = base.choices.map((s) => [...s]);
    choices[0][0] = "inventado";
    expect(assemblePlan({ ...base, choices })).toEqual({ ok: false, reason: "id_fuera_de_catalogo" });
  });

  it("un ejercicio de otra región en el hueco se rechaza", () => {
    const base = ctx();
    const choices = base.choices.map((s) => [...s]);
    choices[0][0] = byRegion("traccion_superior_vertical").id;
    expect(assemblePlan({ ...base, choices })).toEqual({ ok: false, reason: "region_incorrecta" });
  });

  it("un número de sesiones o huecos distinto a la plantilla se rechaza", () => {
    const base = ctx();
    expect(assemblePlan({ ...base, choices: base.choices.slice(0, 2) })).toEqual({ ok: false, reason: "forma_incorrecta" });
  });

  it("aplica las limitaciones después, en código: con rodilla no queda ningún ejercicio que la cargue", () => {
    const result = assemblePlan(ctx({ limitations: ["rodilla"] }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const byId = new Map<string, Exercise>(CATALOG.map((e) => [e.id, e]));
    for (const slot of result.plan.sessions.flatMap((s) => s.slots)) {
      if (slot.exerciseId) expect(byId.get(slot.exerciseId)!.joints).not.toContain("rodilla");
      else expect(slot.holeReason).toBeDefined();
    }
  });

  it("ningún grupo pasa del techo de 20 series aunque los minutos dieran para más", () => {
    const template = buildTemplate(3, "musculo");
    const result = assemblePlan(ctx({ template, choices: choose(template), minutes: 75, focus: "musculo" }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const plan = { sessions: result.plan.sessions.map((s) => ({ slots: s.slots })) };
    const issues = validateVolume(plan, CATALOG, availableExercises(CATALOG, ALL_EQUIPMENT_IDS, [])).issues;
    expect(issues.filter((i) => i.code === "techo_series_grupo")).toEqual([]);
  });

  it("un hueco sin ningún ejercicio con el equipo del usuario queda vacío con motivo de equipo", () => {
    const base = ctx();
    // Sin jalón: no hay tracción vertical posible. La IA no recibe ese hueco (choice null).
    const equipmentIds = ALL_EQUIPMENT_IDS.filter((id) => id !== "jalon");
    const choices = base.choices.map((s, i) => s.map((id, j) => (base.template.sessions[i].slots[j].region === "traccion_superior_vertical" ? null : id)));
    const result = assemblePlan({ ...base, equipmentIds, choices });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const holes = result.plan.sessions.flatMap((s) => s.slots).filter((s) => s.exerciseId === null);
    expect(holes).toHaveLength(3);
    expect(holes.every((h) => h.holeReason === "sin_alternativa_equipo")).toBe(true);
  });

  it("un hueco que la limitación deja vacío se rellena con otro ejercicio de la región que no carga la zona", () => {
    // Única pierna (empuje) sin rodilla en el catálogo de prueba: ninguna. Con «cadera» solo cae
    // la sentadilla y la prensa; queda la extensión de cuádriceps (otro patrón).
    const result = assemblePlan(ctx({ limitations: ["cadera"] }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const legPush = result.plan.sessions.map((s) => s.slots.find((slot) => slot.region === "empuje_inferior")!);
    expect(legPush.every((slot) => slot.exerciseId === "extension_cuadriceps")).toBe(true);
  });

  it("si la limitación deja un grupo posible por debajo de 2 sesiones, cambia un ejercicio de su región por uno que lo trabaje", () => {
    // La IA elige curl femoral (sin glúteo) en la tracción de pierna de las 3 sesiones; con
    // «rodilla», los glúteos solo pueden venir del hip thrust o del peso muerto.
    // En la fixture el curl carga la rodilla; aquí no, para que el refiltrado no lo cambie solo.
    const catalog = CATALOG.map((e) => (e.id === "curl_femoral" ? { ...e, joints: [] } : e));
    const base = ctx({ limitations: ["rodilla"], catalog });
    const choices = base.choices.map((s, i) => s.map((id, j) => (base.template.sessions[i].slots[j].region === "traccion_inferior" ? "curl_femoral" : id)));
    const result = assemblePlan({ ...base, choices });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const byId = new Map(catalog.map((e) => [e.id, e]));
    const withGlutes = result.plan.sessions.filter((s) => s.slots.some((slot) => slot.exerciseId && byId.get(slot.exerciseId)!.muscleGroups.includes("gluteos")));
    expect(withGlutes.length).toBeGreaterThanOrEqual(2);
  });

  it("se permite repetir un ejercicio en la sesión solo si no queda otro de esa región", () => {
    const template = buildTemplate(4, "equilibrado");
    const choices = choose(template);
    // Sesión de pierna: 2 huecos de tracción inferior; con un solo ejercicio de esa región, se repite.
    const onlyOne = CATALOG.filter((e) => e.region !== "traccion_inferior" || e.id === "peso_muerto_rumano");
    const forced = choices.map((s, i) => s.map((id, j) => (template.sessions[i].slots[j].region === "traccion_inferior" ? "peso_muerto_rumano" : id)));
    expect(assemblePlan(ctx({ template, choices: forced, catalog: onlyOne })).ok).toBe(true);
    // Con alternativas disponibles, repetir sigue rechazándose.
    expect(assemblePlan(ctx({ template, choices: forced }))).toEqual({ ok: false, reason: "repetido" });
  });

  it("4 días dan torso y pierna alternos con etiqueta de sesión", () => {
    const template = buildTemplate(4, "equilibrado");
    const result = assemblePlan(ctx({ template, choices: choose(template) }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.plan.sessions.map((s) => s.label)).toEqual(["Torso", "Pierna", "Torso", "Pierna"]);
  });
});
