import { describe, expect, it } from "vitest";
import { nextPrescription } from "./progression";
import {
  calibrationState,
  estimatedMinutes,
  exerciseHistory,
  formatKg,
  isRepeatedDiscomfort,
  workingWeightAfter,
  type LoggedSet,
} from "./session";
import type { EquipmentType } from "./types";

const jalon: EquipmentType = { id: "polea", incrementKg: 2.5, minKg: 5 };

const set = (sessionId: string, setIndex: number, weightKg: number, reps: number, status: LoggedSet["status"] = "hecha"): LoggedSet => ({
  sessionId,
  exerciseId: "jalon",
  setIndex,
  weightKg,
  reps,
  rir: null,
  status,
  createdAt: "2026-11-18T10:00:00Z",
});

describe("exerciseHistory", () => {
  it("agrupa por sesión en orden y toma la carga de la última serie hecha", () => {
    const sets = [set("s2", 1, 45, 8), set("s1", 2, 42.5, 12), set("s1", 1, 42.5, 12), set("s2", 2, 45, 7, "saltada")];
    expect(exerciseHistory(sets, "jalon", ["s1", "s2"], new Set())).toEqual([
      { loadKg: 42.5, sets: [{ reps: 12, skipped: false }, { reps: 12, skipped: false }], discomfort: false },
      { loadKg: 45, sets: [{ reps: 8, skipped: false }, { reps: 7, skipped: true }], discomfort: false },
    ]);
  });

  it("una Molestia antes de la primera serie deja la sesión en el historial, marcada", () => {
    expect(exerciseHistory([], "jalon", ["s1"], new Set(["s1"]))).toEqual([{ loadKg: 0, sets: [], discomfort: true }]);
  });

  it("una fila detenida marca la sesión como Molestia aunque no haya marca, y no cuenta como serie", () => {
    const sets = [set("s1", 1, 42.5, 12), set("s1", 2, 0, 0, "detenida")];
    expect(exerciseHistory(sets, "jalon", ["s1"], new Set())).toEqual([
      { loadKg: 42.5, sets: [{ reps: 12, skipped: false }], discomfort: true },
    ]);
  });

  it("ignora las sesiones en las que no se hizo el ejercicio", () => {
    expect(exerciseHistory([set("s1", 1, 40, 10)], "jalon", ["s0", "s1"], new Set())).toHaveLength(1);
  });

  it("tras dos sesiones en el techo, la siguiente precarga un salto más y el suelo del rango", () => {
    const sets = [1, 2, 3].flatMap((i) => [set("s1", i, 42.5, 12), set("s2", i, 42.5, 12)]);
    const history = exerciseHistory(sets, "jalon", ["s1", "s2"], new Set());
    expect(nextPrescription({ currentLoadKg: 42.5, repRange: { min: 8, max: 12 }, history }, jalon)).toEqual({ loadKg: 45, reps: 8 });
  });

  it("con Molestia en la última sesión no sube aunque estuviera en el techo", () => {
    const sets = [1, 2, 3].flatMap((i) => [set("s1", i, 42.5, 12), set("s2", i, 42.5, 12)]);
    const history = exerciseHistory(sets, "jalon", ["s1", "s2"], new Set(["s2"]));
    expect(nextPrescription({ currentLoadKg: 42.5, repRange: { min: 8, max: 12 }, history }, jalon).loadKg).toBe(42.5);
  });
});

describe("calibrationState", () => {
  const cal = (setIndex: number, weightKg: number, rir: number, reps = 10) => ({ setIndex, weightKg, rir, reps });

  it("sin series, pide la primera con la carga de inicio", () => {
    expect(calibrationState([], 25, 10, jalon)).toEqual({ done: false, nextSetIndex: 1, nextLoadKg: 25 });
  });

  it("4+ sube un salto y pide otra serie", () => {
    expect(calibrationState([cal(1, 25, 4)], 25, 10, jalon)).toEqual({ done: false, nextSetIndex: 2, nextLoadKg: 27.5 });
  });

  it("2 o 3 fija la carga", () => {
    expect(calibrationState([cal(1, 25, 4), cal(2, 27.5, 2)], 25, 10, jalon)).toEqual({ done: true, fixedLoadKg: 27.5 });
  });

  it("no llegar a las repeticiones baja un salto, sin pasar del mínimo", () => {
    expect(calibrationState([cal(1, 5, 3, 6)], 5, 10, jalon)).toEqual({ done: false, nextSetIndex: 2, nextLoadKg: 5 });
  });

  it("la tercera serie fija su carga pase lo que pase", () => {
    expect(calibrationState([cal(1, 25, 4), cal(2, 27.5, 4), cal(3, 30, 0)], 25, 10, jalon)).toEqual({ done: true, fixedLoadKg: 30 });
  });

  it("recalcula en orden de serie aunque lleguen desordenadas", () => {
    expect(calibrationState([cal(2, 27.5, 2), cal(1, 25, 4)], 25, 10, jalon)).toEqual({ done: true, fixedLoadKg: 27.5 });
  });
});

describe("workingWeightAfter", () => {
  const s = (setIndex: number, weightKg: number, status: "hecha" | "saltada" = "hecha") => ({ setIndex, weightKg, status });

  it("toma la carga más repetida: bajar en la última serie no la hunde", () => {
    expect(workingWeightAfter(42.5, [s(1, 45), s(2, 45), s(3, 42.5)], false)).toBe(45);
  });

  it("si empatan, la de la serie más reciente", () => {
    expect(workingWeightAfter(40, [s(1, 42.5), s(2, 45)], false)).toBe(45);
  });

  it("con una fila detenida (Molestia sin marca) se queda como estaba", () => {
    expect(workingWeightAfter(42.5, [s(1, 45), { setIndex: 2, weightKg: 0, status: "detenida" }], false)).toBe(42.5);
  });

  it("con Molestia se queda como estaba", () => {
    expect(workingWeightAfter(42.5, [s(1, 45)], true)).toBe(42.5);
  });

  it("sin series hechas se queda como estaba", () => {
    expect(workingWeightAfter(42.5, [s(1, 45, "saltada")], false)).toBe(42.5);
  });
});

describe("isRepeatedDiscomfort", () => {
  it("es repetida si la sesión anterior con ese ejercicio tuvo Molestia", () => {
    expect(isRepeatedDiscomfort("s1", new Set(["s1"]))).toBe(true);
    expect(isRepeatedDiscomfort("s1", new Set(["s0"]))).toBe(false);
    expect(isRepeatedDiscomfort(null, new Set(["s0"]))).toBe(false);
  });
});

describe("formato", () => {
  it("minutos redondeados a 5", () => {
    expect(estimatedMinutes(17)).toBe(45);
    expect(estimatedMinutes(0)).toBe(0);
  });

  it("kg con coma decimal", () => {
    expect(formatKg(42.5)).toBe("42,5");
    expect(formatKg(45)).toBe("45");
    expect(formatKg(1.25)).toBe("1,25");
  });
});
