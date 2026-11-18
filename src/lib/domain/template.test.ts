import { describe, expect, it } from "vitest";
import { buildTemplate, focusParams } from "./template";

const upper = [
  "empuje_superior_horizontal",
  "traccion_superior_horizontal",
  "empuje_superior_vertical",
  "traccion_superior_vertical",
];

describe("buildTemplate", () => {
  it("2 y 3 días dan cuerpo completo en cada sesión", () => {
    for (const days of [2, 3] as const) {
      const template = buildTemplate(days, "equilibrado");
      expect(template.sessions.map((s) => s.kind)).toEqual(Array(days).fill("cuerpo_completo"));
      for (const session of template.sessions) {
        expect(session.slots.map((s) => s.region).sort()).toEqual(
          [...upper, "empuje_inferior", "traccion_inferior"].sort(),
        );
      }
    }
  });

  it("4 días dan torso y pierna alternos; 5 días empiezan y terminan en torso", () => {
    expect(buildTemplate(4, "equilibrado").sessions.map((s) => s.kind)).toEqual(["torso", "pierna", "torso", "pierna"]);
    expect(buildTemplate(5, "equilibrado").sessions.map((s) => s.kind)).toEqual([
      "torso",
      "pierna",
      "torso",
      "pierna",
      "torso",
    ]);
    const [torso, pierna] = buildTemplate(4, "equilibrado").sessions;
    expect(torso.slots.map((s) => s.region).sort()).toEqual([...upper].sort());
    expect(pierna.slots.map((s) => s.region).sort()).toEqual(
      ["empuje_inferior", "empuje_inferior", "traccion_inferior", "traccion_inferior"].sort(),
    );
  });

  it("cada hueco lleva al menos 2 series", () => {
    for (const days of [2, 3, 4, 5] as const) {
      for (const slot of buildTemplate(days, "musculo").sessions.flatMap((s) => s.slots)) {
        expect(slot.sets).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it("equilibrado y perder grasa: 8–12 repeticiones en todos los huecos", () => {
    for (const focus of ["equilibrado", "grasa"] as const) {
      const slots = buildTemplate(3, focus).sessions.flatMap((s) => s.slots);
      expect(slots.every((s) => s.repMin === 8 && s.repMax === 12 && !s.principal)).toBe(true);
    }
  });

  it("más músculo: 8–15 repeticiones", () => {
    const slots = buildTemplate(4, "musculo").sessions.flatMap((s) => s.slots);
    expect(slots.every((s) => s.repMin === 8 && s.repMax === 15)).toBe(true);
  });

  it("más fuerza: el primer hueco de cada sesión es el principal, 5–8 y 3 series; el resto 8–12", () => {
    for (const session of buildTemplate(3, "fuerza").sessions) {
      const [first, ...rest] = session.slots;
      expect(first).toMatchObject({ principal: true, repMin: 5, repMax: 8, sets: 3 });
      expect(rest.every((s) => !s.principal && s.repMin === 8 && s.repMax === 12)).toBe(true);
    }
  });
});

describe("focusParams", () => {
  it("series por grupo y semana según la tabla del PRD §7", () => {
    expect(focusParams("equilibrado").weeklySets).toEqual({ min: 10, max: 14 });
    expect(focusParams("fuerza").weeklySets).toEqual({ min: 10, max: 14 });
    expect(focusParams("musculo").weeklySets).toEqual({ min: 14, max: 20 });
    expect(focusParams("grasa").weeklySets).toEqual({ min: 10, max: 14 });
  });

  it("solo perder grasa lleva el bloque de cardio opcional", () => {
    expect(focusParams("grasa").cardioBlock).toBe(true);
    expect(focusParams("equilibrado").cardioBlock).toBe(false);
  });
});
