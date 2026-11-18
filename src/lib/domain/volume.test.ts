import { describe, expect, it } from "vitest";
import { availableExercises } from "./exclusion";
import { ALL_EQUIPMENT_IDS, CATALOG } from "./test-fixtures";
import type { Plan, PlanSlot } from "./types";
import { validateVolume } from "./volume";

const slot = (exerciseId: string, sets = 3): PlanSlot => ({ exerciseId, sets });

// Cuerpo completo, 2 días: cada grupo principal 2 veces; pecho/cuádriceps/isquios/hombros 6 series,
// espalda y glúteos 12.
const fullBody = (): PlanSlot[] => [
  slot("prensa"),
  slot("peso_muerto_rumano"),
  slot("press_pecho_maquina"),
  slot("remo_polea"),
  slot("jalon_pecho"),
  slot("press_hombro_maquina"),
];
const validPlan = (): Plan => ({ sessions: [{ slots: fullBody() }, { slots: fullBody() }] });

const everything = availableExercises(CATALOG, ALL_EQUIPMENT_IDS, []);

describe("validateVolume", () => {
  it("un plan válido pasa", () => {
    expect(validateVolume(validPlan(), CATALOG, everything)).toEqual({ ok: true, issues: [] });
  });

  it("21 series de un grupo en la semana se rechazan", () => {
    const plan = validPlan();
    plan.sessions[0].slots[2] = slot("press_pecho_maquina", 11);
    plan.sessions[1].slots[2] = slot("press_pecho_maquina", 10);
    expect(validateVolume(plan, CATALOG, everything)).toEqual({
      ok: false,
      issues: [{ code: "techo_series_grupo", group: "pecho" }],
    });
  });

  it("20 series de un grupo en la semana pasan", () => {
    const plan = validPlan();
    plan.sessions[0].slots[2] = slot("press_pecho_maquina", 10);
    plan.sessions[1].slots[2] = slot("press_pecho_maquina", 10);
    expect(validateVolume(plan, CATALOG, everything).ok).toBe(true);
  });

  it("un grupo principal con ejercicios posibles trabajado 1 vez por semana se rechaza", () => {
    const plan = validPlan();
    plan.sessions[1].slots = plan.sessions[1].slots.filter(
      (s) => s.exerciseId !== "remo_polea" && s.exerciseId !== "jalon_pecho",
    );
    expect(validateVolume(plan, CATALOG, everything)).toEqual({
      ok: false,
      issues: [{ code: "suelo_frecuencia_grupo", group: "espalda" }],
    });
  });

  it("un ejercicio con 1 serie se rechaza", () => {
    const plan = validPlan();
    plan.sessions[0].slots[5] = slot("press_hombro_maquina", 1);
    expect(validateVolume(plan, CATALOG, everything).issues).toContainEqual({
      code: "minimo_series_ejercicio",
      exerciseId: "press_hombro_maquina",
    });
  });

  it("un grupo sin ningún ejercicio posible (rodilla, sin alternativa de cuádriceps) valida con hueco (KTD20)", () => {
    const conRodilla = availableExercises(CATALOG, ALL_EQUIPMENT_IDS, ["rodilla"]);
    const session = (): PlanSlot[] => [
      { exerciseId: null, sets: 3, holeReason: "sin_alternativa_limitacion" },
      slot("peso_muerto_rumano"),
      slot("press_pecho_maquina"),
      slot("remo_polea"),
      slot("jalon_pecho"),
      slot("press_hombro_maquina"),
    ];
    const plan: Plan = { sessions: [{ slots: session() }, { slots: session() }] };
    expect(validateVolume(plan, CATALOG, conRodilla)).toEqual({ ok: true, issues: [] });
  });
});
