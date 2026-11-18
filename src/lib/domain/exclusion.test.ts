import { describe, expect, it } from "vitest";
import { availableExercises, isExcludedByLimitations, lightMatches } from "./exclusion";
import { ALL_EQUIPMENT_IDS, CATALOG, byId } from "./test-fixtures";

const ids = (list: { id: string }[]) => list.map((e) => e.id).sort();

describe("isExcludedByLimitations", () => {
  it("«rodilla» excluye prensa y sentadilla, no el press de pecho", () => {
    expect(isExcludedByLimitations(byId("prensa"), ["rodilla"])).toBe(true);
    expect(isExcludedByLimitations(byId("sentadilla_barra"), ["rodilla"])).toBe(true);
    expect(isExcludedByLimitations(byId("press_pecho_maquina"), ["rodilla"])).toBe(false);
  });

  it("«Ninguna» (lista vacía) no excluye nada", () => {
    expect(CATALOG.filter((e) => isExcludedByLimitations(e, []))).toEqual([]);
  });
});

describe("availableExercises", () => {
  it("dos zonas excluyen la unión", () => {
    const result = availableExercises(CATALOG, ALL_EQUIPMENT_IDS, ["rodilla", "muneca"]);
    expect(ids(result)).toEqual(
      ["hip_thrust", "jalon_pecho", "peso_muerto_rumano", "press_hombro_maquina", "press_pecho_maquina", "remo_polea"].sort(),
    );
  });

  it("sin el equipo de un ejercicio, ese ejercicio no está disponible", () => {
    const sinRack = ALL_EQUIPMENT_IDS.filter((id) => id !== "rack_barra");
    expect(ids(availableExercises(CATALOG, sinRack, []))).not.toContain("sentadilla_barra");
    expect(ids(availableExercises(CATALOG, sinRack, []))).toContain("prensa");
  });
});

describe("contribución leve (jointsLight)", () => {
  const curl = { ...byId("press_pecho_maquina"), id: "curl_maquina", joints: ["codo" as const], jointsLight: ["hombro" as const] };

  it("una zona solo en jointsLight no excluye, pero se informa para el aviso", () => {
    expect(isExcludedByLimitations(curl, ["hombro"])).toBe(false);
    expect(lightMatches(curl, ["hombro"])).toEqual(["hombro"]);
    expect(availableExercises([curl], ALL_EQUIPMENT_IDS, ["hombro"]).map((e) => e.id)).toEqual(["curl_maquina"]);
  });

  it("si otra zona limitada está en joints, se excluye y no hay aviso", () => {
    expect(isExcludedByLimitations(curl, ["hombro", "codo"])).toBe(true);
    expect(lightMatches(curl, ["hombro", "codo"])).toEqual([]);
  });

  it("sin coincidencias no hay aviso", () => {
    expect(lightMatches(curl, ["rodilla"])).toEqual([]);
    expect(lightMatches(byId("prensa"), ["hombro"])).toEqual([]);
  });
});
