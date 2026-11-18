"use client";

import { ChoiceCards, Cta, Icon, Note, WizardScreen } from "@/components/wizard/ui";
import { useStepNext } from "@/components/wizard/use-step-next";
import { useStepView, useWizard } from "@/components/wizard/wizard-provider";
import { EXPERIENCE_LABELS, EXPERIENCE_OPTIONS } from "@/lib/wizard/answers";

// Pantalla 3 (sistema §11.12): nada preseleccionado; Siguiente se activa al elegir.
// Iconos: escalones que suben con la experiencia.
const ICONS = ["M3 20h18M5 20v-3h4v3", "M3 20h18M5 20v-3h4v3M10 20v-7h4v7", "M3 20h18M5 20v-3h4v3M10 20v-7h4v7M15 20v-11h4v11", "M3 20h18M5 20v-3h4v3M10 20v-7h4v7M15 20v-11h4v11M17 5l2-2 2 2"];

export function ExperienciaStep({ editing }: { editing: boolean }) {
  useStepView("experiencia");
  const { draft, setAnswers } = useWizard();
  const { next, pending, error } = useStepNext("experiencia", "/semana", editing);
  const experience = draft.answers.experience;

  return (
    <WizardScreen
      step={3}
      backHref={editing ? "/resumen" : "/foco"}
      title="Tu experiencia"
      subtitle="Con esto ajustamos el primer peso de cada máquina."
      footer={
        <Cta disabled={!experience || pending} onClick={() => experience && next({ experience })}>
          {editing ? "Guardar" : "Siguiente"}
        </Cta>
      }
    >
      <ChoiceCards
        label="Tu experiencia entrenando"
        value={experience}
        onChange={(value) => setAnswers({ experience: value })}
        options={EXPERIENCE_OPTIONS.map((value, i) => ({ value, title: EXPERIENCE_LABELS[value], icon: <Icon d={ICONS[i]} /> }))}
      />
      {error ? <Note tone="danger" role="alert">{error}</Note> : null}
    </WizardScreen>
  );
}
