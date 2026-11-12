import { describe, expect, it } from "vitest";
import { calibrationStartLoad, calibrationStep } from "./calibration";
import type { EquipmentType } from "./types";

// Prensa: salto 5 kg, mínimo 20 kg; carga de calibración 40 kg.
const prensa: EquipmentType = { id: "prensa_piernas", incrementKg: 5, minKg: 20 };

describe("calibrationStartLoad", () => {
  it("«Nunca he entrenado» y «Menos de 6 meses» restan un salto", () => {
    expect(calibrationStartLoad(40, prensa, "nunca")).toBe(35);
    expect(calibrationStartLoad(40, prensa, "menos_6_meses")).toBe(35);
  });

  it("«6 meses–2 años» no cambia la carga", () => {
    expect(calibrationStartLoad(40, prensa, "6_meses_2_anos")).toBe(40);
  });

  it("«Más de 2 años» suma un salto", () => {
    expect(calibrationStartLoad(40, prensa, "mas_2_anos")).toBe(45);
  });

  it("nunca baja del mínimo de la máquina", () => {
    expect(calibrationStartLoad(20, prensa, "nunca")).toBe(20);
  });
});

describe("calibrationStep", () => {
  it("4+ en reserva sube un salto y sigue calibrando", () => {
    expect(calibrationStep({ setNumber: 1, loadKg: 40, rir: 4, reachedTargetReps: true }, prensa)).toEqual({
      action: "subir",
      nextLoadKg: 45,
      done: false,
    });
  });

  it("0–1 en reserva baja un salto", () => {
    for (const rir of [0, 1] as const) {
      expect(calibrationStep({ setNumber: 1, loadKg: 40, rir, reachedTargetReps: true }, prensa)).toEqual({
        action: "bajar",
        nextLoadKg: 35,
        done: false,
      });
    }
  });

  it("no llegar a las repeticiones baja un salto, aunque diga 4+", () => {
    expect(calibrationStep({ setNumber: 2, loadKg: 40, rir: 4, reachedTargetReps: false }, prensa)).toMatchObject({
      action: "bajar",
      nextLoadKg: 35,
    });
  });

  it("2–3 en reserva fija la carga", () => {
    for (const rir of [2, 3] as const) {
      expect(calibrationStep({ setNumber: 1, loadKg: 40, rir, reachedTargetReps: true }, prensa)).toEqual({
        action: "fijar",
        nextLoadKg: 40,
        done: true,
      });
    }
  });

  it("la tercera serie fija la carga aunque no se cumpla el criterio", () => {
    expect(calibrationStep({ setNumber: 3, loadKg: 45, rir: 4, reachedTargetReps: true }, prensa)).toEqual({
      action: "fijar",
      nextLoadKg: 45,
      done: true,
    });
    expect(calibrationStep({ setNumber: 3, loadKg: 45, rir: 0, reachedTargetReps: false }, prensa)).toEqual({
      action: "fijar",
      nextLoadKg: 45,
      done: true,
    });
  });

  it("bajar nunca deja la carga por debajo del mínimo de la máquina", () => {
    expect(calibrationStep({ setNumber: 1, loadKg: 20, rir: 0, reachedTargetReps: false }, prensa).nextLoadKg).toBe(20);
  });
});
