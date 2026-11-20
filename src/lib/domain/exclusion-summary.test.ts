import { describe, expect, it } from "vitest";
import { changeText, exclusionSummary, holeText, joinList, lightBadge, planChanges } from "./exclusion-summary";
import type { Exercise } from "./types";

const ex = (e: Partial<Exercise> & { id: string; name: string; region: Exercise["region"]; joints: Exercise["joints"] }) => ({
  equipmentTypeId: "mancuernas",
  pattern: e.id,
  muscleGroups: ["cuadriceps"],
  calibrationLoadKg: 5,
  ...e,
});

const CATALOG = [
  ex({ id: "goblet", name: "Sentadilla goblet", region: "empuje_inferior", joints: ["rodilla", "cadera"] }),
  ex({ id: "prensa", name: "Prensa de piernas", region: "empuje_inferior", joints: ["rodilla", "cadera"], equipmentTypeId: "prensa" }),
  ex({ id: "extension", name: "Extensión de cuádriceps", region: "empuje_inferior", joints: ["rodilla"], equipmentTypeId: "extension" }),
  ex({ id: "zancada", name: "Zancada", region: "empuje_inferior", joints: ["rodilla", "tobillo"] }),
  ex({ id: "gemelo", name: "Gemelo en máquina", region: "empuje_inferior", joints: ["tobillo"], jointsLight: ["rodilla"], equipmentTypeId: "gemelo" }),
  ex({ id: "remo_mancuerna", name: "Remo con mancuerna", region: "traccion_superior_horizontal", joints: ["hombro", "codo", "muneca"] }),
  ex({ id: "remo_polea", name: "Remo sentado en polea", region: "traccion_superior_horizontal", joints: ["hombro", "codo"], jointsLight: ["espalda_baja"], equipmentTypeId: "polea" }),
];
const ALL = ["mancuernas", "prensa", "extension", "gemelo", "polea"];

describe("joinList", () => {
  it("une con comas y la última con «y» u «o»", () => {
    expect(joinList(["a"])).toBe("a");
    expect(joinList(["a", "b", "c"])).toBe("a, b y c");
    expect(joinList(["a", "b"], "o")).toBe("a o b");
  });
});

describe("exclusionSummary", () => {
  it("sin zonas marcadas no dice nada", () => {
    expect(exclusionSummary([{ region: "empuje_inferior", exerciseId: "goblet" }], CATALOG, ALL, [])).toEqual([]);
  });

  it("una línea por región: lo quitado (dos nombres y «N más»), la zona y lo que queda en el plan con su aviso leve", () => {
    const lines = exclusionSummary([{ region: "empuje_inferior", exerciseId: "gemelo" }], CATALOG, ALL, ["rodilla"]);
    expect(lines).toEqual([
      {
        region: "empuje_inferior",
        text: "Pierna (empuje): fuera Sentadilla goblet, Prensa de piernas y 2 más (cargan la rodilla). En tu plan: Gemelo en máquina · trabaja un poco: rodilla.",
      },
    ]);
  });

  it("lo que el gimnasio no tiene no cuenta como quitado; un solo ejercicio va en singular", () => {
    const lines = exclusionSummary(
      [{ region: "traccion_superior_horizontal", exerciseId: "remo_polea" }],
      CATALOG,
      ["mancuernas", "polea"],
      ["muneca"],
    );
    expect(lines[0].text).toBe("Espalda (remo): fuera Remo con mancuerna (carga la muñeca). En tu plan: Remo sentado en polea.");
  });

  it("una región sin nada quitado no sale, y un hueco vacío se dice", () => {
    const lines = exclusionSummary(
      [
        { region: "empuje_inferior", exerciseId: null },
        { region: "traccion_superior_horizontal", exerciseId: "remo_polea" },
      ],
      CATALOG,
      ["mancuernas", "prensa", "extension", "polea"],
      ["rodilla", "tobillo"],
    );
    expect(lines).toHaveLength(1);
    expect(lines[0].text).toContain("(cargan la rodilla o el tobillo). En tu plan: hueco sin ejercicio.");
  });

  it("nunca usa frases de promesa o diagnóstico", () => {
    const text = exclusionSummary([{ region: "empuje_inferior", exerciseId: "gemelo" }], CATALOG, ALL, ["rodilla"])
      .map((l) => l.text)
      .join(" ");
    for (const banned of ["seguro", "riesgo", "protege", "lesión", "adecuado", "encaja", "no carga"]) expect(text).not.toContain(banned);
  });
});

describe("lightBadge", () => {
  it("solo aparece si el ejercicio trabaja un poco una zona marcada", () => {
    const polea = CATALOG.find((e) => e.id === "remo_polea")!;
    expect(lightBadge(polea, ["espalda_baja"])).toBe("Trabaja un poco: zona lumbar");
    expect(lightBadge(polea, ["rodilla"])).toBeNull();
    expect(lightBadge(polea, [])).toBeNull();
  });
});

describe("holeText", () => {
  it("nombra la zona que deja la región sin ejercicios y recomienda un profesional", () => {
    expect(holeText("empuje_inferior", CATALOG, ["mancuernas", "extension"], ["rodilla"])).toBe(
      "Ningún ejercicio de pierna (empuje) de tu equipo evita cargar la rodilla, que marcaste. Si quieres trabajar esta zona, coméntalo con un profesional.",
    );
  });

  it("sin zona calculable, texto sin zona", () => {
    expect(holeText("core", CATALOG, ALL, ["rodilla"])).toBe("Ningún ejercicio de core de tu equipo encaja con las zonas que marcaste.");
  });
});

describe("planChanges", () => {
  it("lista antes → después con la zona que carga el de antes", () => {
    const changes = planChanges(["remo_mancuerna", "goblet", "gemelo"], ["remo_polea", null, "gemelo"], CATALOG, ["muneca", "rodilla"]);
    expect(changes.map(changeText)).toEqual([
      "Remo con mancuerna → Remo sentado en polea (carga la muñeca)",
      "Sentadilla goblet → sin alternativa (carga la rodilla)",
    ]);
  });

  it("un cambio por equipo no lleva zona y un hueco que se rellena no cuenta como quitado", () => {
    const changes = planChanges(["goblet", null], ["prensa", "gemelo"], CATALOG, []);
    expect(changes.map(changeText)).toEqual(["Sentadilla goblet → Prensa de piernas"]);
  });
});
