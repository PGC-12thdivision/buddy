"use client";

import { FocusPicker } from "@/components/wizard/pickers";
import { Cta, Note, WizardScreen } from "@/components/wizard/ui";
import { useStepNext } from "@/components/wizard/use-step-next";
import { useStepView, useWizard } from "@/components/wizard/wizard-provider";

// Pantalla 2. "Equilibrado" viene preseleccionado (PRD §5). El selector es el mismo de Ajustes (U11).
export function FocoStep({ editing }: { editing: boolean }) {
  useStepView("foco");
  const { draft, setAnswers } = useWizard();
  const { next, pending, error } = useStepNext("foco", "/experiencia", editing);
  const focus = draft.answers.focus;

  return (
    <WizardScreen
      step={2}
      backHref={editing ? "/resumen" : "/"}
      title="Tu foco"
      subtitle="Puedes cambiarlo cuando quieras."
      footer={
        <Cta disabled={!focus || pending} onClick={() => focus && next({ focus })}>
          {editing ? "Guardar" : "Siguiente"}
        </Cta>
      }
    >
      <FocusPicker value={focus} onChange={(value) => setAnswers({ focus: value })} />
      {error ? <Note tone="danger" role="alert">{error}</Note> : null}
    </WizardScreen>
  );
}
