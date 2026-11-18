import Link from "next/link";
import { AppScreen, Disclaimer, Heroes, Tag, WeekStrip } from "@/components/app/screen";
import { StartButton } from "@/components/session/start-button";
import { Note } from "@/components/wizard/ui";
import { requireAppContext } from "@/lib/app/context";
import { estimatedMinutes } from "@/lib/domain/session";

// Hoy (diseño D3, D17, D30; plan.md U6 y U7; dirección B, D59 y D62): portada con las cifras de la
// sesión que toca, la tira de la semana y las filas numeradas. En escritorio, 2 columnas: la sesión
// a la izquierda y la semana a la derecha.

// Lunes de esta semana a las 00:00 en Madrid (la app es para España).
function weekStart(now: Date): Date {
  const local = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Madrid" }));
  const offset = local.getTime() - now.getTime();
  const day = (local.getDay() + 6) % 7;
  local.setHours(0, 0, 0, 0);
  local.setDate(local.getDate() - day);
  return new Date(local.getTime() - offset);
}

export default async function HoyPage() {
  const { supabase, userId, plan, premium, trialDaysLeft, completedSessions } = await requireAppContext();
  const next = plan.sessions[completedSessions % plan.sessions.length];
  const exercises = next.slots.filter((s) => s.exerciseId);
  const totalSets = exercises.reduce((sum, s) => sum + (s.sets ?? 0), 0);

  const [{ count: thisWeek }, { data: open }, { data: states }] = await Promise.all([
    supabase
      .from("workout_sessions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("ended_at", weekStart(new Date()).toISOString()),
    supabase.from("workout_sessions").select("id").eq("user_id", userId).is("ended_at", null).maybeSingle(),
    supabase
      .from("exercise_state")
      .select("exercise_id")
      .eq("user_id", userId)
      .not("calibrated_at", "is", null)
      .in("exercise_id", exercises.map((s) => s.exerciseId as string)),
  ]);
  const calibrated = new Set((states ?? []).map((s) => s.exercise_id));
  const calibration = exercises.some((s) => !calibrated.has(s.exerciseId as string));
  const minutes = estimatedMinutes(totalSets);
  const heroes = [
    { label: "Ejercicios", value: String(exercises.length) },
    // En calibración las series de prueba varían: no se estima la duración (revisión de producto).
    ...(calibration ? [] : [{ label: "Minutos", value: String(minutes), unit: "aprox." }]),
  ];
  const calibrationNote = (
    <Note>Sesión de calibración: no adivinamos tu peso. En cada ejercicio empiezas suave y lo ajustamos serie a serie.</Note>
  );

  return (
    <AppScreen
      kicker={`Día ${next.dayIndex + 1} de ${plan.sessions.length}`}
      title={`Hoy toca ${next.label.toLowerCase()}`}
      heroes={heroes}
      heroesHiddenOnDesktop
      tags={
        premium && trialDaysLeft !== null ? (
          <>
            <Tag premium>Premium</Tag>
            <Tag>{`${trialDaysLeft} ${trialDaysLeft === 1 ? "día" : "días"}`}</Tag>
          </>
        ) : premium ? (
          <Tag premium>Premium</Tag>
        ) : null
      }
      footer={<StartButton>{open ? "Seguir con la sesión" : calibration ? "Empezar calibración" : "Empezar sesión"}</StartButton>}
    >
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-12">
        <aside className="flex flex-col gap-4 lg:order-2" aria-label="Tu semana">
          {/* En escritorio las cifras van aquí, en la columna de 360 px (D62). */}
          <Heroes heroes={heroes} tone="paper" className="hidden lg:flex" />
          <WeekStrip days={plan.daysPerWeek} done={thisWeek ?? 0} />
          {premium && trialDaysLeft !== null && trialDaysLeft <= 2 && trialDaysLeft > 0 ? (
            <Note tone="warn" role="status">
              {`Te quedan ${trialDaysLeft} ${trialDaysLeft === 1 ? "día" : "días"} de premium. `}
              <Link href="/premium" className="font-bold underline underline-offset-2">
                Ver qué incluye
              </Link>
            </Note>
          ) : null}
          {/* Prueba terminada sin pago (sistema §7): la decisión de pago está en "¿CONTINUAR?". */}
          {!premium ? (
            <Note>
              {"Tu prueba premium ha terminado. "}
              <Link href="/premium" className="font-bold underline underline-offset-2">
                Ver qué incluye
              </Link>
            </Note>
          ) : null}
          {calibration ? <div className="hidden lg:block">{calibrationNote}</div> : null}
        </aside>
        <section aria-labelledby="hoy-ejercicios" className="lg:order-1">
          <h2 id="hoy-ejercicios" className="wz-rule-title">
            La sesión
          </h2>
          <ol className="m-0 list-none p-0">
            {exercises.map((slot, i) => (
              <li key={slot.position} className="wz-num-row">
                <span className="wz-num" aria-hidden="true">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="min-w-0 font-bold">{slot.exerciseName}</span>
                <span className="wz-num-val">
                  <b>{`${slot.sets} series`}</b>
                  <span>{`${slot.repMin} a ${slot.repMax} reps`}</span>
                </span>
              </li>
            ))}
          </ol>
          {/* En móvil, el aviso va tras la lista: la sesión se ve antes del pliegue (auditoría de la dirección B). */}
          {calibration ? <div className="mt-4 lg:hidden">{calibrationNote}</div> : null}
        </section>
      </div>
      <Disclaimer />
    </AppScreen>
  );
}
