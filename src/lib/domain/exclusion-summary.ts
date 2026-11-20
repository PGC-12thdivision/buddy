import { hasEquipment, isExcludedByLimitations, lightMatches } from "./exclusion";
import { JOINTS, type Exercise, type Joint } from "./types";

// Exclusiones visibles (debate de etiquetas, 20/11; docs/catalogo/debate-etiquetas/dictamen-final.md).
// Funciones puras que explican al usuario, en su propia pantalla, qué ejercicios hemos quitado y por
// qué zona. Todo se calcula al vuelo con catálogo, equipo, limitaciones y plan: no se guarda nada y
// nada de esto va a logs, analítica, URLs ni prompts (guardarraíl 8).
// Lenguaje: describe el ejercicio o lo que marcó el usuario, nunca su cuerpo ni si algo le conviene.

type Named = Exercise & { name: string };

// Zona sin artículo (distintivo «Trabaja un poco: zona lumbar») y con artículo (frases).
export const JOINT_NOUN: Record<Joint, string> = {
  hombro: "hombro",
  codo: "codo",
  muneca: "muñeca",
  cuello_espalda_alta: "cuello o espalda alta",
  espalda_baja: "zona lumbar",
  cadera: "cadera",
  rodilla: "rodilla",
  tobillo: "tobillo",
};

const JOINT_WITH_ARTICLE: Record<Joint, string> = {
  hombro: "el hombro",
  codo: "el codo",
  muneca: "la muñeca",
  cuello_espalda_alta: "el cuello o la espalda alta",
  espalda_baja: "la zona lumbar",
  cadera: "la cadera",
  rodilla: "la rodilla",
  tobillo: "el tobillo",
};

// Región del hueco en texto de usuario (la misma que usa la pantalla del plan).
export const REGION_TEXT: Record<string, string> = {
  empuje_inferior: "pierna (empuje)",
  traccion_inferior: "pierna (tracción)",
  empuje_superior_horizontal: "pecho",
  traccion_superior_horizontal: "espalda (remo)",
  empuje_superior_vertical: "hombro",
  traccion_superior_vertical: "espalda (jalón)",
  brazo: "brazo",
  core: "core",
};

export function joinList(items: readonly string[], word = "y"): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} ${word} ${items.at(-1)}`;
}

const ordered = (joints: Iterable<Joint>): Joint[] => {
  const set = new Set(joints);
  return JOINTS.filter((j) => set.has(j));
};

// Zonas marcadas que carga un ejercicio (las que lo excluyen), en el orden fijo de JOINTS.
export function excludingJoints(exercise: Exercise, limitations: readonly Joint[]): Joint[] {
  return ordered(exercise.joints.filter((j) => limitations.includes(j)));
}

// «la rodilla» · «la rodilla o la zona lumbar».
export function zonesText(joints: readonly Joint[]): string {
  return joinList(joints.map((j) => JOINT_WITH_ARTICLE[j]), "o");
}

// Distintivo gris bajo el nombre: solo si el ejercicio trabaja un poco una zona que el usuario marcó.
export function lightBadge(exercise: Exercise, limitations: readonly Joint[]): string | null {
  const matches = ordered(lightMatches(exercise, limitations));
  return matches.length ? `Trabaja un poco: ${joinList(matches.map((j) => JOINT_NOUN[j]))}` : null;
}

export type RegionExclusion = {
  region: string;
  // Línea completa para el bloque «Ver qué hemos quitado».
  text: string;
};

const MAX_NAMED = 2;

// Una línea por región del plan con algo quitado por las limitaciones (con el equipo del usuario: lo
// que su gimnasio no tiene no se cuenta como «quitado»). Vacío si no marcó ninguna zona.
export function exclusionSummary(
  planSlots: readonly { region: string; exerciseId: string | null }[],
  catalog: readonly Named[],
  equipmentIds: readonly string[],
  limitations: readonly Joint[],
): RegionExclusion[] {
  if (limitations.length === 0) return [];
  const byId = new Map(catalog.map((e) => [e.id, e]));
  const regions = [...new Set(planSlots.map((s) => s.region))];
  const lines: RegionExclusion[] = [];
  for (const region of regions) {
    const removed = catalog.filter(
      (e) => e.region === region && hasEquipment(e, equipmentIds) && isExcludedByLimitations(e, limitations),
    );
    if (removed.length === 0) continue;
    const zones = ordered(removed.flatMap((e) => excludingJoints(e, limitations)));
    const named = removed.slice(0, MAX_NAMED).map((e) => e.name);
    const rest = removed.length - named.length;
    const removedText = rest > 0 ? `${named.join(", ")} y ${rest} más` : joinList(named);
    const verb = removed.length === 1 ? "carga" : "cargan";

    const inPlan = [
      ...new Set(
        planSlots
          .filter((s) => s.region === region && s.exerciseId)
          .map((s) => byId.get(s.exerciseId as string))
          .filter((e): e is Named => e !== undefined),
      ),
    ];
    const lightZones = ordered(inPlan.flatMap((e) => lightMatches(e, limitations)));
    const inPlanText = inPlan.length
      ? `En tu plan: ${joinList(inPlan.map((e) => e.name))}${lightZones.length ? ` · trabaja un poco: ${joinList(lightZones.map((j) => JOINT_NOUN[j]))}` : ""}.`
      : "En tu plan: hueco sin ejercicio.";

    const title = REGION_TEXT[region] ?? region;
    lines.push({
      region,
      text: `${title.charAt(0).toUpperCase()}${title.slice(1)}: fuera ${removedText} (${verb} ${zonesText(zones)}). ${inPlanText}`,
    });
  }
  return lines;
}

// Texto del hueco vacío por limitación: nombra la zona (decisión de Pablo, 20/11). La zona es la que
// excluye los ejercicios de esa región con su equipo; si no se puede calcular, texto sin zona.
export function holeText(
  region: string,
  catalog: readonly Exercise[],
  equipmentIds: readonly string[],
  limitations: readonly Joint[],
): string {
  const zones = ordered(
    catalog
      .filter((e) => e.region === region && hasEquipment(e, equipmentIds))
      .flatMap((e) => excludingJoints(e, limitations)),
  );
  const where = REGION_TEXT[region] ?? "este hueco";
  if (zones.length === 0) return `Ningún ejercicio de ${where} de tu equipo encaja con las zonas que marcaste.`;
  return `Ningún ejercicio de ${where} de tu equipo evita cargar ${zonesText(zones)}, que marcaste. Si quieres trabajar esta zona, coméntalo con un profesional.`;
}

export type PlanChange = { from: string; to: string | null; zones: Joint[] };

// Lista de cambios del refiltrado (antes → después) para el aviso de Ajustes. Solo los huecos que
// cambian de ejercicio; la zona solo si el ejercicio de antes carga una zona marcada (si cambió por
// equipo, sin zona).
export function planChanges(
  before: readonly (string | null)[],
  after: readonly (string | null)[],
  catalog: readonly Named[],
  limitations: readonly Joint[],
): PlanChange[] {
  const byId = new Map(catalog.map((e) => [e.id, e]));
  const changes: PlanChange[] = [];
  before.forEach((fromId, i) => {
    const toId = after[i] ?? null;
    if (fromId === toId || fromId === null) return;
    const from = byId.get(fromId);
    if (!from) return;
    changes.push({
      from: from.name,
      to: toId ? (byId.get(toId)?.name ?? null) : null,
      zones: excludingJoints(from, limitations),
    });
  });
  return changes;
}

// «Remo con mancuerna → Remo sentado en polea (carga la muñeca)».
export function changeText(change: PlanChange): string {
  const to = change.to ?? "sin alternativa";
  const why = change.zones.length ? ` (carga ${zonesText(change.zones)})` : "";
  return `${change.from} → ${to}${why}`;
}
