import { hasEquipment, isExcludedByLimitations } from "./exclusion";
import type { Exercise, HoleReason, Joint, Plan, PlanSlot } from "./types";

// Refiltrado y alternativas (PRD §7 y §9; D35; guardarraíl 6). Misma lógica que «Sustituir»:
// alternativa = mismo patrón y mismo grupo principal (el primero de muscleGroups), con equipo
// disponible y sin cargar ninguna zona limitada. Determinista: orden del catálogo. Sin IA.

export type RefilterContext = {
  catalog: readonly Exercise[];
  equipmentIds: readonly string[];
  limitations: readonly Joint[];
};

const isAllowed = (e: Exercise, ctx: RefilterContext) =>
  hasEquipment(e, ctx.equipmentIds) && !isExcludedByLimitations(e, ctx.limitations);

const sameSlotKind = (a: Exercise, b: Exercise) => a.pattern === b.pattern && a.muscleGroups[0] === b.muscleGroups[0];

export function alternativesFor(
  exercise: Exercise,
  ctx: RefilterContext,
  excludeIds: readonly string[] = [],
): Exercise[] {
  return ctx.catalog.filter(
    (e) => e.id !== exercise.id && !excludeIds.includes(e.id) && sameSlotKind(e, exercise) && isAllowed(e, ctx),
  );
}

// Motivo cerrado que se guarda, nunca la zona (diseño §11.27). La pantalla del plan nombra la zona al vuelo
// (holeText, decisión de Pablo del 20/11), sin guardarla. Es «limitación» si algún ejercicio del mismo
// patrón y grupo con equipo disponible está fuera por una limitación; si no, falta equipo.
function holeReason(exercise: Exercise, ctx: RefilterContext): HoleReason {
  const blockedByLimitation = ctx.catalog.some(
    (e) => sameSlotKind(e, exercise) && hasEquipment(e, ctx.equipmentIds) && isExcludedByLimitations(e, ctx.limitations),
  );
  return blockedByLimitation ? "sin_alternativa_limitacion" : "sin_alternativa_equipo";
}

export function refilterPlan(plan: Plan, ctx: RefilterContext): Plan {
  const byId = new Map(ctx.catalog.map((e) => [e.id, e]));
  return {
    ...plan,
    sessions: plan.sessions.map((session) => {
      const used = session.slots.map((s) => s.exerciseId).filter((id): id is string => id !== null);
      return {
        ...session,
        slots: session.slots.map((slot): PlanSlot => {
          const exercise = slot.exerciseId === null ? undefined : byId.get(slot.exerciseId);
          if (!exercise || isAllowed(exercise, ctx)) return slot;
          const [alternative] = alternativesFor(exercise, ctx, used);
          if (alternative) {
            used.push(alternative.id);
            return { ...slot, exerciseId: alternative.id };
          }
          return { ...slot, exerciseId: null, holeReason: holeReason(exercise, ctx) };
        }),
      };
    }),
  };
}
