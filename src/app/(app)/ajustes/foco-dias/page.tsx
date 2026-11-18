import { AppScreen } from "@/components/app/screen";
import { requireAppContext } from "@/lib/app/context";
import { aiCallRecords, canStartAiCall, nextMonthStartText } from "@/lib/domain/ai-limits";
import type { Days } from "@/lib/domain/template";
import { createAdminClient } from "@/lib/supabase/admin";
import { FOCUS_OPTIONS, type WizardAnswers } from "@/lib/wizard/answers";
import { FocoDiasAjustes, type Availability } from "./form";

// Ajustes, Foco y días (diseño D15 y D26/D43): cambiarlos regenera el plan con IA. Gratis, un cambio
// al mes; premium, sin ese límite dentro del tope de regeneraciones. Aquí solo se anuncia si queda
// cambio: el límite de verdad lo aplica la reserva atómica en la base de datos (KTD18).

// La Server Action regenera con IA: mismo tope que /api/plan (KTD10).
export const maxDuration = 120;

const MONTH_MS = 32 * 24 * 60 * 60 * 1000;

export default async function AjustesFocoDias() {
  const { supabase, userId, premium } = await requireAppContext();
  const now = new Date();
  const [answers, calls] = await Promise.all([
    supabase.from("onboarding_answers").select("focus, days_per_week").eq("user_id", userId).maybeSingle(),
    // ai_calls no tiene políticas para el usuario: la lee el servidor, con el user_id de los claims.
    createAdminClient()
      .from("ai_calls")
      .select("kind, outcome, created_at")
      .eq("user_id", userId)
      .gte("created_at", new Date(now.getTime() - MONTH_MS).toISOString()),
  ]);

  // Si la lectura falla, se deja intentar: la reserva en la base de datos decide igualmente.
  const check = canStartAiCall({ kind: "cambio_foco_dias", premium, now, calls: aiCallRecords(calls.data ?? []), maxDurationMs: maxDuration * 1000 });
  const availability: Availability = check.allowed
    ? { allowed: true }
    : { allowed: false, reason: check.reason === "tope_diario" ? "tope_diario" : "limite", from: nextMonthStartText(now) };

  const focus = FOCUS_OPTIONS.includes(answers.data?.focus as WizardAnswers["focus"]) ? (answers.data?.focus as WizardAnswers["focus"]) : undefined;
  const days = answers.data?.days_per_week as Days | undefined;

  return (
    <AppScreen kicker="Ajustes" title="Foco y días" subtitle="Cambiarlos crea un plan nuevo con tu equipo y tus limitaciones.">
      <FocoDiasAjustes initialFocus={focus} initialDays={days} premium={premium} availability={availability} />
    </AppScreen>
  );
}
