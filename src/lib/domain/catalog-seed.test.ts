import { describe, expect, it } from "vitest";
import { lightWarningFor } from "@/lib/app/session-data";
import { loadSeedCatalog, updatedIds } from "@/test/seed-catalog";
import {
  availableExercises,
  isExcludedByLimitations,
  lightMatches,
} from "./exclusion";
import { assemblePlan } from "./plan-build";
import { buildTemplate, isExtraRegion } from "./template";
import {
  EXTRA_MUSCLE_GROUPS,
  JOINTS,
  MAIN_MUSCLE_GROUPS,
  REGIONS,
  type Joint,
} from "./types";
import { validateVolume } from "./volume";

// Comprobaciones sobre el catálogo real de las migraciones (semilla + ampliado del 18/11).
const { before, after, equipment } = loadSeedCatalog();
const equipmentIds = equipment.map((e) => e.id);
const groups: readonly string[] = [
  ...MAIN_MUSCLE_GROUPS,
  ...EXTRA_MUSCLE_GROUPS,
];

describe("catálogo ampliado: cordura", () => {
  it("pasa de 32 a más de 100 ejercicios, sin IDs repetidos", () => {
    expect(before).toHaveLength(32);
    expect(after.length).toBeGreaterThanOrEqual(100);
    expect(new Set(after.map((e) => e.id)).size).toBe(after.length);
  });

  it("cada ejercicio tiene región, equipo y grupo principal válidos", () => {
    for (const e of after) {
      expect(REGIONS, e.id).toContain(e.region);
      expect(equipmentIds, e.id).toContain(e.equipmentTypeId);
      expect(e.muscleGroups.length, e.id).toBeGreaterThan(0);
      for (const g of e.muscleGroups)
        expect(groups, `${e.id}: ${g}`).toContain(g);
    }
  });

  it("los ejercicios de las regiones principales tienen un grupo principal de las reglas de volumen", () => {
    for (const e of after.filter((x) => !isExtraRegion(x.region))) {
      const main = e.muscleGroups.some((g) =>
        (MAIN_MUSCLE_GROUPS as readonly string[]).includes(g),
      );
      // Los gemelos y los aductores (pierna) son la excepción histórica del catálogo semilla.
      if (!["gemelos", "aductores"].includes(e.muscleGroups[0]))
        expect(main, e.id).toBe(true);
    }
  });

  it("cada ejercicio tiene técnica corta en castellano", () => {
    for (const e of after) {
      expect(e.technique?.trim().length ?? 0, e.id).toBeGreaterThan(20);
      expect(e.technique!.length, e.id).toBeLessThanOrEqual(200);
    }
  });

  it("joints y joints_light son etiquetas válidas y disjuntas", () => {
    for (const e of after) {
      for (const j of [...e.joints, ...e.jointsLight])
        expect(JOINTS, e.id).toContain(j);
      expect(
        e.joints.filter((j) => e.jointsLight.includes(j)),
        e.id,
      ).toEqual([]);
    }
  });

  it("hay nota de contribución leve solo si hay joints_light, y dice que se pare si duele", () => {
    for (const e of after) {
      expect(e.lightNote !== null, e.id).toBe(e.jointsLight.length > 0);
      if (e.lightNote)
        expect(e.lightNote, e.id).toMatch(/para y márcalo como molestia/);
    }
  });

  it("la carga de calibración no baja del mínimo del equipo", () => {
    const byId = new Map(equipment.map((e) => [e.id, e]));
    for (const e of after)
      expect(e.calibrationLoadKg, e.id).toBeGreaterThanOrEqual(
        byId.get(e.equipmentTypeId)!.minKg,
      );
  });

  it("ningún ejercicio existente pierde una etiqueta de articulación (solo se añaden)", () => {
    const now = new Map(after.map((e) => [e.id, e]));
    expect(updatedIds().sort()).toEqual(before.map((e) => e.id).sort());
    for (const old of before) {
      for (const j of old.joints)
        expect(now.get(old.id)!.joints, old.id).toContain(j);
      expect(now.get(old.id)!.region, old.id).toBe(old.region);
    }
  });

  it("aplica las adiciones de la revisión del 18/11", () => {
    const now = new Map(after.map((e) => [e.id, e]));
    expect(now.get("sentadilla_hack")!.joints).toContain("cuello_espalda_alta");
    expect(now.get("sentadilla_multipower")!.joints).toEqual(
      expect.arrayContaining(["hombro", "cuello_espalda_alta"]),
    );
    expect(now.get("gemelo_maquina")!.joints).toEqual(
      expect.arrayContaining(["espalda_baja", "cuello_espalda_alta"]),
    );
  });

  it("cada región principal y cada región extra tiene ejercicios", () => {
    for (const region of REGIONS)
      expect(
        after.some((e) => e.region === region),
        region,
      ).toBe(true);
  });
});

describe("contribución leve", () => {
  const byId = new Map(after.map((e) => [e.id, e]));

  it("con el hombro limitado, el curl en máquina no se excluye pero avisa", () => {
    const curl = byId.get("curl_biceps_maquina")!;
    expect(isExcludedByLimitations(curl, ["hombro"])).toBe(false);
    expect(lightMatches(curl, ["hombro"])).toEqual(["hombro"]);
    expect(lightWarningFor(curl, ["hombro"])).toBe(curl.lightNote);
    expect(lightWarningFor(curl, [])).toBeNull();
  });

  it("si una zona limitada está en joints, se excluye y no hay aviso aunque otra esté en joints_light", () => {
    const curl = byId.get("curl_biceps_maquina")!;
    expect(isExcludedByLimitations(curl, ["hombro", "codo"])).toBe(true);
    expect(lightMatches(curl, ["hombro", "codo"])).toEqual([]);
    expect(lightWarningFor(curl, ["hombro", "codo"])).toBeNull();
  });

  it("con la rodilla limitada, la sentadilla a banco alto queda con aviso y la prensa fuera", () => {
    expect(
      isExcludedByLimitations(byId.get("sentadilla_cajon_alto")!, ["rodilla"]),
    ).toBe(false);
    expect(
      lightWarningFor(byId.get("sentadilla_cajon_alto")!, ["rodilla"]),
    ).toMatch(/rodilla/);
    expect(
      isExcludedByLimitations(byId.get("prensa_piernas")!, ["rodilla"]),
    ).toBe(true);
  });
});

// Matriz de generación con el catálogo real y el gimnasio Completo: elección «perfecta» de la IA
// (primer ejercicio de la región no usado en la sesión), con y sin limitaciones.
describe("plan con el catálogo real", () => {
  const cases: Joint[][] = [
    [],
    ["hombro"],
    ["rodilla"],
    ["espalda_baja"],
    ["codo"],
    ["muneca"],
    ["hombro", "rodilla"],
  ];
  for (const focus of ["equilibrado", "fuerza", "musculo", "grasa"] as const) {
    for (const days of [2, 3, 4, 5] as const) {
      for (const minutes of [30, 45, 60, 75]) {
        for (const limitations of cases) {
          it(`${focus}, ${days} días, ${minutes} min, ${limitations.join("+") || "sin limitaciones"}`, () => {
            const template = buildTemplate(days, focus, minutes);
            const choices = template.sessions.map((s) => {
              const used: string[] = [];
              return s.slots.map((slot) => {
                const e = after.find(
                  (x) => x.region === slot.region && !used.includes(x.id),
                )!;
                used.push(e.id);
                return e.id;
              });
            });
            const result = assemblePlan({
              template,
              choices,
              catalog: after,
              equipmentIds,
              limitations,
              minutes,
              focus,
            });
            expect(result).toMatchObject({ ok: true });
            if (!result.ok) return;
            const byId = new Map(after.map((e) => [e.id, e]));
            const available = availableExercises(
              after,
              equipmentIds,
              limitations,
            );
            const issues = validateVolume(
              {
                sessions: result.plan.sessions.map((x) => ({ slots: x.slots })),
              },
              after,
              available,
            ).issues;
            expect(
              issues.filter((i) => i.code !== "suelo_frecuencia_grupo"),
            ).toEqual([]);
            for (const session of result.plan.sessions) {
              const filled = session.slots.filter((s) => s.exerciseId !== null);
              expect(filled.length).toBeGreaterThan(0);
              for (const slot of filled)
                expect(
                  isExcludedByLimitations(
                    byId.get(slot.exerciseId!)!,
                    limitations,
                  ),
                ).toBe(false);
              // Los huecos principales nunca pasan de lo que permiten los minutos.
              const sets = session.slots.reduce(
                (sum, s) => sum + (s.exerciseId ? s.sets : 0),
                0,
              );
              expect(sets * 2.5).toBeLessThanOrEqual(
                Math.max(minutes, session.slots.length * 2 * 2.5),
              );
            }
          });
        }
      }
    }
  }
});
