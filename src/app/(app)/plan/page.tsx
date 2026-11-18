import Link from "next/link";
import { AppScreen, Disclaimer, Tag } from "@/components/app/screen";
import { StartButton } from "@/components/session/start-button";
import { Note } from "@/components/wizard/ui";
import { FOCUS_TEXT, planTitle, requireAppContext } from "@/lib/app/context";
import type { ActiveSlot } from "@/lib/app/active-plan";

// Pestaña Plan (diseño D4, D17, D28, D30; plan.md U6; dirección B, D59). Portada con los días y los
// minutos; un día por sección de revista ("DÍA 1") con filas numeradas; en escritorio, un día por
// columna. La variante "recién generado" (antes de la primera sesión) es la única con CTA.

const REGION_TEXT: Record<string, string> = {
  empuje_inferior: "pierna (empuje)",
  traccion_inferior: "pierna (tracción)",
  empuje_superior_horizontal: "pecho",
  traccion_superior_horizontal: "espalda (remo)",
  empuje_superior_vertical: "hombro",
  traccion_superior_vertical: "espalda (jalón)",
};

function SlotRow({ slot, index }: { slot: ActiveSlot; index: number }) {
  if (!slot.exerciseId) {
    const why =
      slot.gapReason === "sin_alternativa_limitacion"
        ? `Ningún ejercicio de ${REGION_TEXT[slot.region] ?? "este hueco"} encaja con tus limitaciones y tu equipo.`
        : `Tu gimnasio no tiene equipo para ${REGION_TEXT[slot.region] ?? "este hueco"}.`;
    return (
      <li className="wz-rule-row flex-col items-start justify-center py-2 text-warn">
        <span className="font-bold">
          <span aria-hidden="true">! </span>Hueco vacío
        </span>
        <span className="text-[14px] text-foreground">{why}</span>
        <Link href="/ajustes/gimnasio" className="wz-link text-[14px]">
          Revisar Mi gimnasio
        </Link>
      </li>
    );
  }
  return (
    <li className="wz-num-row">
      <span className="wz-num" aria-hidden="true">
        {String(index + 1).padStart(2, "0")}
      </span>
      <span className="min-w-0 font-bold">{slot.exerciseName}</span>
      <span className="wz-num-val">
        <b>{`${slot.sets} series`}</b>
        <span>{`${slot.repMin} a ${slot.repMax} reps`}</span>
      </span>
    </li>
  );
}

export default async function PlanPage() {
  const { plan, trialDaysLeft, completedSessions } = await requireAppContext();
  const fresh = completedSessions === 0;
  const minutes = await minutesPerSession();

  return (
    <AppScreen
      kicker={FOCUS_TEXT[plan.focus]}
      title={planTitle(plan.daysPerWeek, plan.template)}
      heroes={[
        { label: "Días", value: String(plan.daysPerWeek) },
        ...(minutes ? [{ label: "Minutos", value: String(minutes) }] : []),
      ]}
      tags={fresh ? <Tag>Plan listo</Tag> : plan.source === "refiltrado" ? <Tag>Plan actualizado</Tag> : null}
      footer={fresh ? <StartButton>Empezar calibración</StartButton> : undefined}
    >
      <Disclaimer />
      {fresh ? (
        <div className="-rotate-1 rounded-md border-[3px] border-foreground bg-primary p-3 text-primary-foreground shadow-[4px_4px_0_var(--secondary)]">
          <span className="wz-tag bg-foreground text-background">Primera sesión</span>
          <p className="m-0 mt-2">
            <b>Es de calibración.</b> No adivinamos tu peso: lo encontramos serie a serie.
          </p>
          {trialDaysLeft !== null && trialDaysLeft > 0 ? (
            <p className="m-0 mt-2 text-[14px]">Tienes 14 días de premium gratis: tu coach semanal te espera al acabar tu primera semana.</p>
          ) : null}
        </div>
      ) : null}
      {plan.sessions.some((s) => s.slots.some((slot) => !slot.exerciseId)) ? (
        <Note tone="warn" role="status">
          Algún hueco se ha quedado sin ejercicio. Nunca te proponemos uno que cargue una zona limitada.
        </Note>
      ) : null}

      <div className={`grid gap-6 ${plan.sessions.length > 3 ? "lg:grid-cols-3" : "lg:grid-cols-[repeat(auto-fit,minmax(0,1fr))]"}`}>
        {plan.sessions.map((session) => (
          <section key={session.dayIndex} aria-labelledby={`dia-${session.dayIndex}`}>
            <p className="wz-kicker m-0 mb-1" style={{ color: "var(--secondary)" }}>
              {session.label}
            </p>
            <h2 id={`dia-${session.dayIndex}`} className="wz-rule-title text-[26px]">
              {`Día ${session.dayIndex + 1}`}
            </h2>
            <ol className="m-0 list-none p-0">
              {session.slots.map((slot, i) => (
                <SlotRow key={slot.position} slot={slot} index={i} />
              ))}
            </ol>
          </section>
        ))}
      </div>

      {plan.focus === "grasa" ? (
        <Note>
          Al final de cada sesión, opcional: 10 a 20 minutos de cardio suave si tu gimnasio tiene cinta, bici o elíptica. La dieta es la palanca
          principal para perder grasa.
        </Note>
      ) : null}
      <p className="wz-help">Cada grupo muscular principal trabaja al menos 2 veces por semana, siempre que tu equipo y tus limitaciones lo permitan.</p>
    </AppScreen>
  );
}

async function minutesPerSession(): Promise<number | null> {
  const { supabase, userId } = await requireAppContext();
  const { data } = await supabase.from("onboarding_answers").select("minutes_per_session").eq("user_id", userId).maybeSingle();
  return data?.minutes_per_session ?? null;
}
