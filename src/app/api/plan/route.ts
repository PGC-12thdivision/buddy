import { NextResponse } from "next/server";
import { generateAndSavePlan } from "@/lib/app/plan-generation";
import { exerciseCatalog, sanitizeEquipment } from "@/lib/catalog";
import type { Days } from "@/lib/domain/template";
import type { Focus, Joint } from "@/lib/domain/types";
import { createClient } from "@/lib/supabase/server";
import { hasActiveConsent, sessionUserId } from "@/lib/wizard/account";

// POST /api/plan: genera el plan inicial con IA (plan.md U5; diagrama "Generación del plan").
// Frontera de autorización (KTD15): sesión, consentimiento vigente y cribado superado leídos aquí;
// el user_id sale solo de los claims. La reserva, la llamada y el guardado los hace
// generateAndSavePlan, que comparte el cambio de foco o días de Ajustes (U11).

// Tope de la función en Vercel (KTD10). Una reserva pendiente más antigua se da por liberada.
export const maxDuration = 120;

type PlanStatus = "ok" | "sin_sesion" | "sin_permiso" | "incompleto" | "limite" | "tope_diario" | "conexion" | "validacion";
const reply = (status: PlanStatus, httpStatus = 200) => NextResponse.json({ status }, { status: httpStatus });

export async function POST() {
  const supabase = await createClient();
  const userId = await sessionUserId(supabase);
  if (!userId) return reply("sin_sesion", 401);

  const [consent, health, answers, gym] = await Promise.all([
    hasActiveConsent(supabase, userId),
    supabase.from("health_profile").select("limitations").eq("user_id", userId).maybeSingle(),
    supabase.from("onboarding_answers").select("*").eq("user_id", userId).maybeSingle(),
    supabase.from("gym_profiles").select("equipment_type_ids").eq("user_id", userId).maybeSingle(),
  ]);
  // Sin consentimiento vigente o sin cribado superado no se llama a la IA (guardarraíles 5 y 8).
  if (!consent || !health.data) return reply("sin_permiso", 403);
  if (!answers.data || !gym.data) return reply("incompleto", 409);

  const catalog = await exerciseCatalog();
  const equipmentIds = sanitizeEquipment(
    gym.data.equipment_type_ids,
    [...new Set(catalog.map((e) => e.equipmentTypeId))],
  );
  if (equipmentIds.length === 0) return reply("incompleto", 409);

  const status = await generateAndSavePlan({
    userId,
    kind: "plan",
    periodLimit: 1,
    maxDurationS: maxDuration,
    focus: answers.data.focus as Focus,
    days: answers.data.days_per_week as Days,
    minutesPerSession: answers.data.minutes_per_session,
    sports: answers.data.sports,
    catalog,
    equipmentIds,
    limitations: health.data.limitations as Joint[],
  });
  return status === "reserva_fallida" ? reply("conexion", 503) : reply(status);
}
