import { readFileSync } from "node:fs";
import type { EquipmentType, Exercise, Joint, Region } from "@/lib/domain/types";

// Catálogo real leído de las migraciones (solo para tests): el semilla de U2 más el catálogo ampliado
// del 18/11, con sus UPDATE aplicados. Así los tests prueban lo mismo que hay en staging y prod.

export const SEED_FILE = "supabase/migrations/20261112131416_catalogo_semilla.sql";
export const EXPANDED_FILE = "supabase/migrations/20261118163149_catalogo_ampliado.sql";

type Value = string | number | null;

// Tuplas de una lista de VALUES: cadenas '...' (con '' escapado), números y null.
function parseTuples(block: string): Value[][] {
  const rows: Value[][] = [];
  let row: Value[] | null = null;
  let i = 0;
  while (i < block.length) {
    const c = block[i];
    if (c === "-" && block[i + 1] === "-") {
      while (i < block.length && block[i] !== "\n") i++;
    } else if (c === "(" && row === null) {
      row = [];
      i++;
    } else if (c === ")" && row !== null) {
      // «on conflict (id)» abre y cierra paréntesis sin valores: no es una fila.
      if (row.length > 0) rows.push(row);
      row = null;
      i++;
    } else if (row !== null && c === "'") {
      let s = "";
      i++;
      while (i < block.length) {
        if (block[i] === "'" && block[i + 1] === "'") {
          s += "'";
          i += 2;
        } else if (block[i] === "'") {
          i++;
          break;
        } else s += block[i++];
      }
      row.push(s);
    } else if (row !== null && /[0-9.]/.test(c)) {
      let n = "";
      while (/[0-9.]/.test(block[i])) n += block[i++];
      row.push(Number(n));
    } else if (row !== null && block.startsWith("null", i)) {
      row.push(null);
      i += 4;
    } else i++;
  }
  return rows;
}

const between = (sql: string, start: string, end: string) => {
  const from = sql.indexOf(start);
  if (from < 0) throw new Error(`No encuentro «${start}»`);
  const to = sql.indexOf(end, from + start.length);
  return sql.slice(from + start.length, to);
};

const arr = (v: Value) => String(v).replace(/^\{|\}$/g, "").split(",").filter(Boolean);

export type SeedExercise = Exercise & {
  name: string;
  jointsLight: Joint[];
  technique: string | null;
  lightNote: string | null;
};
export type SeedEquipment = EquipmentType & { name: string; zone: string };

function equipmentFrom(sql: string): SeedEquipment[] {
  const block = between(sql, "insert into public.equipment_types (id, name, zone, increment_kg, min_kg) values", ";");
  return parseTuples(block).map(([id, name, zone, inc, min]) => ({
    id: String(id),
    name: String(name),
    zone: String(zone),
    incrementKg: Number(inc),
    minKg: Number(min),
  }));
}

export function loadSeedCatalog(): { before: SeedExercise[]; after: SeedExercise[]; equipment: SeedEquipment[] } {
  const seed = readFileSync(SEED_FILE, "utf8");
  const expanded = readFileSync(EXPANDED_FILE, "utf8");

  const before: SeedExercise[] = parseTuples(
    between(seed, "insert into public.exercises (id, name, equipment_type_id, pattern, region, muscle_groups, joints, calibration_load_kg) values", ";"),
  ).map(([id, name, eq, pattern, region, groups, joints, cal]) => ({
    id: String(id),
    name: String(name),
    equipmentTypeId: String(eq),
    pattern: String(pattern),
    region: String(region) as Region,
    muscleGroups: arr(groups),
    joints: arr(joints) as Joint[],
    jointsLight: [],
    calibrationLoadKg: Number(cal),
    technique: null,
    lightNote: null,
  }));

  const added: SeedExercise[] = parseTuples(
    between(
      expanded,
      "insert into public.exercises (id, name, equipment_type_id, pattern, region, muscle_groups, joints, joints_light, calibration_load_kg, technique, light_note) values",
      ";",
    ),
  ).map(([id, name, eq, pattern, region, groups, joints, light, cal, technique, note]) => ({
    id: String(id),
    name: String(name),
    equipmentTypeId: String(eq),
    pattern: String(pattern),
    region: String(region) as Region,
    muscleGroups: arr(groups),
    joints: arr(joints) as Joint[],
    jointsLight: arr(light) as Joint[],
    calibrationLoadKg: Number(cal),
    technique: technique === null ? null : String(technique),
    lightNote: note === null ? null : String(note),
  }));

  const updates = new Map(
    parseTuples(between(expanded, "from (values", ") as v(id, joints, joints_light, technique, light_note)")).map(([id, joints, light, technique, note]) => [
      String(id),
      { joints: arr(joints) as Joint[], jointsLight: arr(light) as Joint[], technique: technique === null ? null : String(technique), lightNote: note === null ? null : String(note) },
    ]),
  );

  const known = new Set(before.map((e) => e.id));
  const after = [
    ...before.map((e) => ({ ...e, ...(updates.get(e.id) ?? {}) })),
    // ON CONFLICT DO NOTHING: un ID que ya existía no se pisa.
    ...added.filter((e) => !known.has(e.id)),
  ].sort((a, b) => (a.id < b.id ? -1 : 1));

  const equipment = [...equipmentFrom(seed), ...equipmentFrom(expanded)];
  return { before, after, equipment };
}

export function updatedIds(): string[] {
  const expanded = readFileSync(EXPANDED_FILE, "utf8");
  return parseTuples(between(expanded, "from (values", ") as v(id, joints, joints_light, technique, light_note)")).map((r) => String(r[0]));
}
