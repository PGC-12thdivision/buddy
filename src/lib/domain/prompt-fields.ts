import { hasEquipment } from "./exclusion";
import type { Exercise } from "./types";

// Lista cerrada de campos que puede llevar un prompt de IA (guardarraíl 8; D29, D44; KTD19).
// Nunca limitaciones, cribado, molestias, email ni nombre. El catálogo se filtra solo por equipo,
// nunca por limitaciones, para que no se pueda deducir ninguna; las limitaciones se aplican
// después, en código, con el refiltrado.

export const PROMPT_FIELDS = ["catalogo", "foco", "dias", "minutos", "deportes", "escalas", "actividades"] as const;

// Campos que salen del perfil; el catálogo lo construye esta función.
const PROFILE_FIELDS = PROMPT_FIELDS.filter((f) => f !== "catalogo");

export type PromptSource = {
  // Puede traer más campos: solo se copian los de la lista cerrada.
  profile: Record<string, unknown>;
  catalog: readonly Exercise[];
  equipmentIds: readonly string[];
};

export function buildPromptPayload({ profile, catalog, equipmentIds }: PromptSource): string {
  const payload: Record<string, unknown> = {
    catalogo: catalog
      .filter((e) => hasEquipment(e, equipmentIds))
      .map((e) => ({ id: e.id, patron: e.pattern, region: e.region, grupos: e.muscleGroups })),
  };
  for (const field of PROFILE_FIELDS) {
    if (profile[field] !== undefined) payload[field] = profile[field];
  }
  return JSON.stringify(payload);
}
