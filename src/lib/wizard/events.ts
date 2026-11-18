import { z } from "zod";

// Lista cerrada de eventos de producto (plan.md KTD14): la misma que el check de la tabla `events`.
// No hay evento de bloqueo ni de resultado del cribado; el cribado es un único paso "seguridad" (D30).

export const EVENT_NAMES = [
  "wizard_vista",
  "wizard_completada",
  "wizard_abandonada",
  "registro",
  "plan_generado",
  "sesion_empezada",
  "sesion_terminada",
  "sustituir",
  "saltar",
  "checkin_hecho",
  "checkout_iniciado",
  "premium_activado",
] as const;

export const WIZARD_STEPS = [
  "bienvenida",
  "foco",
  "experiencia",
  "disponibilidad",
  "deportes",
  "gimnasio",
  "registro",
  "consentimiento",
  "limitaciones",
  "seguridad",
  "resumen",
  "plan",
] as const;

export type EventName = (typeof EVENT_NAMES)[number];
export type WizardStep = (typeof WIZARD_STEPS)[number];

// Los que emite el wizard al ver y completar cada pantalla.
export const wizardEventSchema = z.object({
  name: z.enum(["wizard_vista", "wizard_completada"]),
  step: z.enum(WIZARD_STEPS),
});

export type WizardEvent = z.infer<typeof wizardEventSchema>;
