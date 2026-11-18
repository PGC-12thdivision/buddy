"use client";

import { ChoiceCards, Cta, Icon, Note, WizardScreen } from "@/components/wizard/ui";
import { useStepNext } from "@/components/wizard/use-step-next";
import { useStepView, useWizard } from "@/components/wizard/wizard-provider";
import { FOCUS_LABELS, type WizardAnswers } from "@/lib/wizard/answers";

// Pantalla 2. "Equilibrado" viene preseleccionado (PRD §5).
const OPTIONS: { value: WizardAnswers["focus"]; description: string; icon: string }[] = [
  { value: "equilibrado", description: "Un poco de todo: fuerza, músculo y forma", icon: "M12 4v16M7 20h10M4 7h16M4 7l-2.5 7h5zM20 7l-2.5 7h5z" },
  { value: "fuerza", description: "Un ejercicio principal pesado y el resto de apoyo", icon: "M2 12h20M5 8v8M8 5v14M16 5v14M19 8v8" },
  { value: "musculo", description: "Más series por grupo muscular", icon: "M5 9v6M8 6v12M16 6v12M19 9v6M8 12h8" },
  {
    value: "grasa",
    description: "Fuerza y cardio opcional. La dieta es la palanca principal",
    icon: "M12 3c1 4 6 6 6 11a6 6 0 0 1-12 0c0-3 1.5-5 3-6.5 0 2.5 1 4 3 4.5 0-3-1-6 0-9z",
  },
];

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
      <ChoiceCards
        label="Tu foco"
        value={focus}
        onChange={(value) => setAnswers({ focus: value })}
        options={OPTIONS.map((o) => ({ value: o.value, title: FOCUS_LABELS[o.value], description: o.description, icon: <Icon d={o.icon} /> }))}
      />
      {error ? <Note tone="danger" role="alert">{error}</Note> : null}
    </WizardScreen>
  );
}
