import { describe, expect, it } from "vitest";
import { loadSeedCatalog } from "@/test/seed-catalog";
import { ZONE_LABELS } from "./zones";
import { BASIC_PRESET_EQUIPMENT, FREE_WEIGHT_PRESET_EQUIPMENT, presetEquipment, templateHint } from "./answers";

// IDs de equipo del catálogo (semilla de U2 más el catálogo ampliado del 18/11): los presets solo
// pueden marcar equipo que exista.
const { equipment } = loadSeedCatalog();
const seedEquipment = equipment.map((e) => e.id);

describe("presets de Mi gimnasio", () => {
  it("el catálogo semilla y el ampliado se han leído", () => {
    expect(seedEquipment.length).toBeGreaterThanOrEqual(40);
    expect(new Set(seedEquipment).size).toBe(seedEquipment.length);
  });

  it("cada tipo de equipo tiene una zona con etiqueta en Mi gimnasio", () => {
    for (const e of equipment) expect(Object.keys(ZONE_LABELS)).toContain(e.zone);
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
