import Link from "next/link";
import { AppScreen, Disclaimer, Tag } from "@/components/app/screen";
import { StartButton } from "@/components/session/start-button";
import { Note } from "@/components/wizard/ui";
import { FOCUS_TEXT, planTitle, requireAppContext } from "@/lib/app/context";
import type { ActiveSlot } from "@/lib/app/active-plan";
import { loadExclusionInputs } from "@/lib/app/refilter-core";
import { exclusionSummary, holeText, lightBadge, REGION_TEXT } from "@/lib/domain/exclusion-summary";

type AppContext = Awaited<ReturnType<typeof requireAppContext>>;

// Pestaña Plan (diseño D4, D17, D28, D30; plan.md U6; dirección B, D59). Portada con los días y los
// minutos; un día por sección de revista ("DÍA 1") con filas numeradas; en escritorio, un día por
// columna. La variante "recién generado" (antes de la primera sesión) es la única con CTA.

// Exclusiones visibles (dictamen del 20/11): el hueco por limitación nombra la zona que marcó el usuario
// (solo en su pantalla, calculado al vuelo; holeReason guardado sigue siendo un motivo cerrado).
function SlotRow({ slot, index, hole, badge }: { slot: ActiveSlot; index: number; hole: string; badge: string | null }) {
  if (!slot.exerciseId) {
    const why = slot.gapReason === "sin_alternativa_limitacion" ? hole : `Tu gimnasio no tiene equipo para ${REGION_TEXT[slot.region] ?? "este hueco"}.`;
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
      <span className="min-w-0">
        <span className="font-bold">{slot.exerciseName}</span>
        {badge ? <span className="block text-[13px] font-normal text-muted-foreground">{badge}</span> : null}
      </span>
      <span className="wz-num-val">
        <b>{`${slot.sets} series`}</b>
        <span>{`${slot.repMin} a ${slot.repMax} reps`}</span>
      </span>
    </li>
  );
}

export default async function PlanPage() {
  const { plan, trialDaysLeft, completedSessions, supabase, userId } = await requireAppContext();
  const fresh = completedSessions === 0;
  const [minutes, inputs] = await Promise.all([minutesPerSession(supabase, userId), loadExclusionInputs(supabase, userId)]);
  const { catalog, equipmentIds, limitations } = inputs;
  const byId = new Map(catalog.map((e) => [e.id, e]));
  const allSlots = plan.sessions.flatMap((s) => s.slots);
  const removed = exclusionSummary(allSlots, catalog, equipmentIds, limitations);

  return (
    <AppScreen
      kicker={FOCUS_TEXT[plan.focus]}
      title={planTitle(plan.daysPerWeek, plan.sessions.map((s) => s.label))}
      heroes={[
        { label: "Días", value: String(plan.daysPerWeek) },
        ...(minutes ? [{ label: "Minutos", value: String(minutes) }] : []),
      ]}
      tags={fresh ? <Tag>Plan listo</Tag> : plan.source === "refiltrado" ? <Tag>Plan actualizado</Tag> : plan.source === "checkin" ? <Tag>Ajustado por tu coach</Tag> : null}
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
      {removed.length > 0 ? (
        <details className="rounded-md border-2 border-border bg-card px-3 py-1" data-exclusiones="">
          <summary className="flex min-h-11 cursor-pointer items-center font-extrabold">
            Ajustado a las zonas que marcaste · Ver qué hemos quitado
          </summary>
          <ul className="m-0 flex list-none flex-col gap-2 p-0 pb-3 pt-1 text-[14px]">
            {removed.map((line) => (
              <li key={line.region}>{line.text}</li>
            ))}
          </ul>
          <p className="wz-help pb-3">No es consejo médico. Si algo te molesta, para y márcalo como molestia.</p>
        </details>
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
                <SlotRow
                  key={slot.position}
                  slot={slot}
                  index={i}
                  hole={holeText(slot.region, catalog, equipmentIds, limitations)}
                  badge={slot.exerciseId && byId.has(slot.exerciseId) ? lightBadge(byId.get(slot.exerciseId)!, limitations) : null}
                />
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

async function minutesPerSession(supabase: AppContext["supabase"], userId: string): Promise<number | null> {
  const { data } = await supabase.from("onboarding_answers").select("minutes_per_session").eq("user_id", userId).maybeSingle();
  return data?.minutes_per_session ?? null;
}
