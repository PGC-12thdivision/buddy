import type { Route } from "next";
import { AppScreen, Disclaimer, Tag } from "@/components/app/screen";
import { CtaLink, Note } from "@/components/wizard/ui";
import { requireAppContext } from "@/lib/app/context";

// Hoy (diseño D3, D17, D30; plan.md U6): la sesión que toca, los días de prueba y, el día 12, el
// aviso de que se acaba. La fila del check-in llega con U8 y la sesión con U7.

export default async function HoyPage() {
  const { plan, premium, trialDaysLeft, completedSessions } = await requireAppContext();
  const next = plan.sessions[completedSessions % plan.sessions.length];
  const calibration = completedSessions === 0;
  const exercises = next.slots.filter((s) => s.exerciseId);

  return (
    <AppScreen
      title={`Hoy toca ${next.label.toLowerCase()}`}
      subtitle={calibration ? "Tu primera sesión es de calibración." : `Día ${next.dayIndex + 1} de tu plan.`}
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
      footer={<CtaLink href={"/sesion" as Route}>{calibration ? "Empezar calibración" : "Empezar sesión"}</CtaLink>}
    >
      {premium && trialDaysLeft !== null && trialDaysLeft <= 2 && trialDaysLeft > 0 ? (
        <Note tone="warn" role="status">{`Te quedan ${trialDaysLeft} ${trialDaysLeft === 1 ? "día" : "días"} de premium.`}</Note>
      ) : null}
      {calibration ? (
        <Note>No adivinamos tu peso: en cada ejercicio empiezas suave y lo ajustamos serie a serie según cómo te sientas.</Note>
      ) : null}
      <section aria-labelledby="hoy-ejercicios">
        <h2 id="hoy-ejercicios" className="wz-rule-title">
          {`${exercises.length} ejercicios`}
        </h2>
        <ul className="m-0 list-none p-0">
          {exercises.map((slot) => (
            <li key={slot.position} className="wz-rule-row">
              <span className="font-bold">{slot.exerciseName}</span>
              <span className="wz-rule-value text-[14px] text-muted-foreground">{`${slot.sets} series`}</span>
            </li>
          ))}
        </ul>
      </section>
      <Disclaimer />
    </AppScreen>
  );
}
