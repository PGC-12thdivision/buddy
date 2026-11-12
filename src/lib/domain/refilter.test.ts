import { describe, expect, it } from "vitest";
import { alternativesFor, refilterPlan } from "./refilter";
import { ALL_EQUIPMENT_IDS, CATALOG, byId } from "./test-fixtures";
import type { Plan } from "./types";

const legPlan = (): Plan => ({
  sessions: [
    {
      slots: [
        { exerciseId: "sentadilla_barra", sets: 3 },
        { exerciseId: "press_pecho_maquina", sets: 3 },
      ],
    },
  ],
});

describe("refilterPlan", () => {
  it("una limitación nueva sustituye la sentadilla por una alternativa del mismo patrón y grupo", () => {
    // La sentadilla con barra carga la espalda baja; la prensa no.
    const result = refilterPlan(legPlan(), { catalog: CATALOG, equipmentIds: ALL_EQUIPMENT_IDS, limitations: ["espalda_baja"] });
    expect(result.sessions[0].slots).toEqual([
      { exerciseId: "prensa", sets: 3 },
      { exerciseId: "press_pecho_maquina", sets: 3 },
    ]);
  });

  it("«rodilla» sin alternativa posible deja un hueco con motivo de limitación, sin nombrar la zona", () => {
    const result = refilterPlan(legPlan(), { catalog: CATALOG, equipmentIds: ALL_EQUIPMENT_IDS, limitations: ["rodilla"] });
    expect(result.sessions[0].slots[0]).toEqual({ exerciseId: null, sets: 3, holeReason: "sin_alternativa_limitacion" });
    expect(JSON.stringify(result)).not.toContain("rodilla");
  });

  it("sin equipo para el patrón deja un hueco con motivo de equipo", () => {
    const equipmentIds = ALL_EQUIPMENT_IDS.filter((id) => id !== "rack_barra" && id !== "prensa_piernas");
    const result = refilterPlan(legPlan(), { catalog: CATALOG, equipmentIds, limitations: [] });
    expect(result.sessions[0].slots[0]).toEqual({ exerciseId: null, sets: 3, holeReason: "sin_alternativa_equipo" });
  });

  it("sin cambios que afecten al plan, lo devuelve igual", () => {
    const result = refilterPlan(legPlan(), { catalog: CATALOG, equipmentIds: ALL_EQUIPMENT_IDS, limitations: ["muneca"] });
    expect(result).toEqual(legPlan());
  });

  it("no repite en la misma sesión un ejercicio que ya está en ella", () => {
    const plan: Plan = {
      sessions: [
        {
          slots: [
            { exerciseId: "sentadilla_barra", sets: 3 },
            { exerciseId: "prensa", sets: 3 },
          ],
        },
      ],
    };
    const result = refilterPlan(plan, { catalog: CATALOG, equipmentIds: ALL_EQUIPMENT_IDS, limitations: ["espalda_baja"] });
    expect(result.sessions[0].slots[0]).toEqual({ exerciseId: null, sets: 3, holeReason: "sin_alternativa_limitacion" });
  });
});

describe("alternativesFor (Sustituir)", () => {
  it("devuelve ejercicios del mismo patrón y grupo, con equipo y no excluidos", () => {
    const alternatives = alternativesFor(byId("press_pecho_maquina"), {
      catalog: CATALOG,
      equipmentIds: ALL_EQUIPMENT_IDS,
      limitations: [],
    });
    expect(alternatives.map((e) => e.id)).toEqual(["press_banca_mancuernas"]);
    expect(
      alternativesFor(byId("press_pecho_maquina"), { catalog: CATALOG, equipmentIds: ALL_EQUIPMENT_IDS, limitations: ["muneca"] }),
    ).toEqual([]);
  });
});
