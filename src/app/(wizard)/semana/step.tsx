"use client";

import { Cta, Note, Question, Segmented, WizardScreen } from "@/components/wizard/ui";
import { useStepNext } from "@/components/wizard/use-step-next";
import { useStepView, useWizard } from "@/components/wizard/wizard-provider";
import { DAYS_OPTIONS, MINUTES_OPTIONS, templateHint } from "@/lib/wizard/answers";

// Pantalla 4, "Tu semana" (sistema §11.12): días y minutos, con la plantilla anunciada en vivo.
export function SemanaStep({ editing }: { editing: boolean }) {
  useStepView("disponibilidad");
  const { draft, setAnswers } = useWizard();
  const { next, pending, error } = useStepNext("disponibilidad", "/deportes", editing);
  const { daysPerWeek, minutesPerSession } = draft.answers;
  const complete = daysPerWeek !== undefined && minutesPerSession !== undefined;

  return (
    <WizardScreen
      step={4}
      backHref={editing ? "/resumen" : "/experiencia"}
      title="Tu semana"
      subtitle="Lo que de verdad puedes, no lo que te gustaría."
      footer={
        <Cta disabled={!complete || pending} onClick={() => complete && next({ daysPerWeek, minutesPerSession })}>
          {editing ? "Guardar" : "Siguiente"}
        </Cta>
      }
    >
      <Question>¿Cuántos días?</Question>
      <Segmented
        label="Días por semana"
        value={daysPerWeek}
        onChange={(value) => setAnswers({ daysPerWeek: value })}
        options={DAYS_OPTIONS.map((n) => ({ value: n, text: String(n) }))}
      />
      <p className="wz-help min-h-5" role="status">
        {daysPerWeek ? templateHint(daysPerWeek) : ""}
      </p>
      <Question>¿Cuánto tiempo por sesión?</Question>
      <Segmented
        label="Minutos por sesión"
        value={minutesPerSession}
        onChange={(value) => setAnswers({ minutesPerSession: value })}
        options={MINUTES_OPTIONS.map((n) => ({ value: n, text: n === 75 ? "75 o más" : String(n) }))}
      />
      <p className="wz-help">Minutos por sesión.</p>
      {error ? <Note tone="danger" role="alert">{error}</Note> : null}
    </WizardScreen>
  );
}
