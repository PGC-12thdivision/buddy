import { describe, expect, it } from "vitest";
import { nextPrescription, type ExerciseSessionLog } from "./progression";
import type { EquipmentType } from "./types";

const prensa: EquipmentType = { id: "prensa_piernas", incrementKg: 5, minKg: 20 };
const range = { min: 8, max: 12 };

const done = (...reps: number[]) => reps.map((r) => ({ reps: r, skipped: false }));
const session = (loadKg: number, sets: ExerciseSessionLog["sets"], discomfort = false): ExerciseSessionLog => ({
  loadKg,
  sets,
  discomfort,
});

const next = (history: ExerciseSessionLog[], currentLoadKg = 40) =>
  nextPrescription({ currentLoadKg, repRange: range, history }, prensa);

describe("nextPrescription (doble progresión)", () => {
  it("sin historial precarga la carga actual y el suelo del rango", () => {
    expect(next([])).toEqual({ loadKg: 40, reps: 8 });
  });

  it("todas las series en el techo dos sesiones seguidas: sube un salto y vuelve al suelo del rango", () => {
    expect(next([session(40, done(12, 12, 12)), session(40, done(12, 12, 12))])).toEqual({ loadKg: 45, reps: 8 });
  });

  it("una sola sesión en el techo no sube", () => {
    expect(next([session(40, done(10, 10, 9)), session(40, done(12, 12, 12))])).toEqual({ loadKg: 40, reps: 12 });
  });

  it("dos sesiones en el techo con cargas distintas no suben", () => {
    expect(next([session(35, done(12, 12, 12)), session(40, done(12, 12, 12))])).toEqual({ loadKg: 40, reps: 12 });
  });

  it("dentro del rango repite carga y precarga las repeticiones más bajas de la última sesión", () => {
    expect(next([session(40, done(11, 10, 9))])).toEqual({ loadKg: 40, reps: 9 });
  });

  it("no llegar al suelo del rango una vez repite la carga", () => {
    expect(next([session(40, done(12, 12, 12)), session(40, done(9, 8, 7))])).toEqual({ loadKg: 40, reps: 8 });
  });

  it("fallar dos sesiones seguidas baja un salto", () => {
    expect(next([session(40, done(8, 7, 6)), session(40, done(8, 7, 7))])).toEqual({ loadKg: 35, reps: 8 });
  });

  it("bajar nunca deja la carga por debajo del mínimo de la máquina", () => {
    expect(next([session(20, done(6, 6)), session(20, done(6, 6))], 20)).toEqual({ loadKg: 20, reps: 8 });
  });

  it("las series saltadas no cuentan", () => {
    const withSkipped = [...done(12, 12), { reps: 0, skipped: true }];
    expect(next([session(40, withSkipped), session(40, withSkipped)])).toEqual({ loadKg: 45, reps: 8 });
  });

  it("una sesión con todas las series saltadas no cuenta ni rompe la racha", () => {
    const allSkipped = [{ reps: 0, skipped: true }];
    expect(next([session(40, done(12, 12, 12)), session(40, allSkipped), session(40, done(12, 12, 12))])).toEqual({
      loadKg: 45,
      reps: 8,
    });
  });

  it("una Molestia hoy no sube la carga", () => {
    expect(next([session(40, done(12, 12, 12)), session(40, done(12, 12, 12), true)])).toEqual({ loadKg: 40, reps: 12 });
  });
});
