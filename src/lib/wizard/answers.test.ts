import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { BASIC_PRESET_EQUIPMENT, FREE_WEIGHT_PRESET_EQUIPMENT, presetEquipment, templateHint } from "./answers";

// IDs de equipo del catálogo semilla (U2): los presets solo pueden marcar equipo que exista.
const seed = readFileSync("supabase/migrations/20261112131416_catalogo_semilla.sql", "utf8");
const seedEquipment = [...seed.matchAll(/^\s+\('([a-z0-9_]+)',\s+'[^']+',\s+'(?:pierna|espalda|pecho_hombro|brazo|peso_libre|cardio)'/gm)].map(
  (m) => m[1],
);

describe("presets de Mi gimnasio", () => {
  it("el catálogo semilla se ha leído", () => {
    expect(seedEquipment.length).toBeGreaterThanOrEqual(25);
  });

  it("todo el equipo de los presets existe en el catálogo semilla", () => {
    for (const id of [...BASIC_PRESET_EQUIPMENT, ...FREE_WEIGHT_PRESET_EQUIPMENT]) expect(seedEquipment).toContain(id);
  });

  it("Completo marca todo; Básico y Solo peso libre solo lo suyo", () => {
    expect(presetEquipment("completo", seedEquipment)).toEqual(seedEquipment);
    expect(presetEquipment("basico", seedEquipment).sort()).toEqual([...BASIC_PRESET_EQUIPMENT].sort());
    expect(presetEquipment("peso_libre", seedEquipment).sort()).toEqual([...FREE_WEIGHT_PRESET_EQUIPMENT].sort());
  });
});

describe("plantilla anunciada en Tu semana", () => {
  it("2 o 3 días: cuerpo completo; 4 o 5: torso y pierna", () => {
    expect(templateHint(3)).toMatch(/cuerpo completo/);
    expect(templateHint(4)).toMatch(/torso y pierna/);
  });
});
