"use client";

import { useState } from "react";
import { Chip, Cta, Note, WizardScreen } from "@/components/wizard/ui";
import { useStepNext } from "@/components/wizard/use-step-next";
import { useStepView, useWizard } from "@/components/wizard/wizard-provider";
import type { ActivityOption } from "@/lib/catalog";

// Pantalla 5 (sistema §11.12): opcional. Chips de selección múltiple y "Ninguno" exclusivo;
// el CTA dice "Saltar" sin selección y "Siguiente" con ella.
export function DeportesStep({ activities, editing }: { activities: ActivityOption[]; editing: boolean }) {
  useStepView("deportes");
  const { draft, setAnswers } = useWizard();
  const { next, pending, error } = useStepNext("deportes", "/gimnasio", editing);
  const sports = draft.answers.sports ?? [];
  const [none, setNone] = useState(false);
  const hasChoice = sports.length > 0 || none;

  function toggle(id: string) {
    setNone(false);
    setAnswers({ sports: sports.includes(id) ? sports.filter((s) => s !== id) : [...sports, id] });
  }

  return (
    <WizardScreen
      step={5}
      backHref={editing ? "/resumen" : "/semana"}
      title="Tus deportes"
      subtitle="Opcional. Así no te cargamos lo mismo el día que juegas."
      footer={
        <Cta disabled={pending} onClick={() => next({ sports })}>
          {editing ? "Guardar" : hasChoice ? "Siguiente" : "Saltar"}
        </Cta>
      }
    >
      <div role="group" aria-label="Deportes que haces" className="flex flex-wrap gap-2">
        {activities.map((a) => (
          <Chip key={a.id} pressed={sports.includes(a.id)} onToggle={() => toggle(a.id)}>
            {a.name}
          </Chip>
        ))}
        <Chip
          pressed={none}
          onToggle={() => {
            setNone(!none);
            setAnswers({ sports: [] });
          }}
        >
          Ninguno
        </Chip>
      </div>
      {error ? <Note tone="danger" role="alert">{error}</Note> : null}
    </WizardScreen>
  );
}
