import { describe, expect, it } from "vitest";
import { calibrationAnswer, setRowLabel, setRows } from "./set-rows";

const set = (setIndex: number, weightKg: number, reps: number, rir: number | null = null, status: "hecha" | "saltada" | "detenida" = "hecha") => ({
  id: `s${setIndex}`,
  setIndex,
  weightKg,
  reps,
  rir,
  status,
});

describe("lista de series", () => {
  it("sesión normal: hechas en orden, la de ahora y las pendientes", () => {
    const rows = setRows([set(2, 22.5, 9), set(1, 20, 10)], 3, null);
    expect(rows.map((r) => r.state)).toEqual(["hecha", "hecha", "ahora"]);
    expect(rows[0]).toMatchObject({ n: 1, weightKg: 20, reps: 10, answer: null });
    expect(rows[1]).toMatchObject({ n: 2, weightKg: 22.5, reps: 9 });
    expect(setRows([], 3, null).map((r) => r.state)).toEqual(["ahora", "pendiente", "pendiente"]);
  });

  it("ignora las filas saltadas y detenidas, y no inventa series de más", () => {
    const rows = setRows([set(1, 20, 10), set(2, 20, 0, null, "saltada"), set(100, 0, 0, null, "detenida")], 2, null);
    expect(rows.map((r) => r.state)).toEqual(["hecha", "ahora"]);
    expect(setRows([set(1, 20, 10), set(2, 20, 10), set(3, 20, 8)], 2, null).map((r) => r.state)).toEqual(["hecha", "hecha", "hecha"]);
  });

  it("calibración: cada prueba con su respuesta y la siguiente, hasta 3", () => {
    const rows = setRows([set(1, 20, 10, 4), set(2, 25, 8, 0)], 3, { targetReps: 10 });
    expect(rows).toHaveLength(3);
    expect(rows[0]).toMatchObject({ state: "hecha", answer: "Quedaban 4+" });
    expect(rows[1]).toMatchObject({ state: "hecha", answer: "No llegó" });
    expect(rows[2]).toEqual({ n: 3, state: "ahora" });
    expect(setRows([set(1, 20, 10, 4), set(2, 25, 10, 4), set(3, 30, 10, 2)], 3, { targetReps: 10 })).toHaveLength(3);
  });

  it("respuesta de calibración", () => {
    expect(calibrationAnswer(2, 10, 10)).toBe("Quedaban 2");
    expect(calibrationAnswer(4, 12, 10)).toBe("Quedaban 4+");
    expect(calibrationAnswer(3, 9, 10)).toBe("No llegó");
    expect(calibrationAnswer(null, 10, 10)).toBe("Quedaban 0");
  });

  it("texto para lector de pantalla, con coma decimal y sin puntos medios", () => {
    const [done, now] = setRows([set(1, 42.5, 1)], 3, null);
    expect(setRowLabel(done, "Serie")).toBe("Serie 1: 42,5 kg, 1 repetición, hecha. Tocar para corregirla");
    expect(setRowLabel(now, "Serie")).toBe("Serie 2: la que toca ahora");
    const [test] = setRows([set(1, 20, 10, 2)], 3, { targetReps: 10 });
    expect(setRowLabel(test, "Prueba")).toBe("Prueba 1: 20 kg, 10 repeticiones, quedaban 2, hecha. Tocar para corregirla");
  });
});
