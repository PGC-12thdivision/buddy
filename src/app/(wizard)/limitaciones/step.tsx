"use client";

import { useRouter } from "next/navigation";
import { Chip, Cta, Note, WizardScreen } from "@/components/wizard/ui";
import { useStepView, useWizard } from "@/components/wizard/wizard-provider";
import { JOINTS, type Joint } from "@/lib/domain/types";
import { JOINT_LABELS } from "@/lib/wizard/zones";

// Pantalla 8 (sistema §11.12; guardarraíl 6): zonas con chips y "Ninguna" exclusiva, sin texto
// libre. Se guardan en memoria y se envían junto con el cribado, con consentimiento vigente.
export function LimitacionesStep() {
  useStepView("limitaciones");
  const router = useRouter();
  const { limitations, setLimitations, screening, track } = useWizard();
  const chosen = limitations ?? [];
  const noneChosen = limitations !== null && limitations.length === 0;
  // Si el cribado articular ya dijo "Sí", hace falta al menos una zona.
  const needsZone = screening.articular === true && chosen.length === 0;

  function toggle(joint: Joint) {
    setLimitations(chosen.includes(joint) ? chosen.filter((j) => j !== joint) : [...chosen, joint]);
  }

  return (
    <WizardScreen
      step={8}
      title="Tus limitaciones"
      subtitle="Quitaremos los ejercicios que cargan estas zonas."
      footer={
        <Cta
          disabled={limitations === null || needsZone}
          onClick={() => {
            track("wizard_completada", "limitaciones");
            router.push("/seguridad");
          }}
        >
          Siguiente
        </Cta>
      }
    >
      <p className="m-0 text-[15px]">¿Alguna zona te molesta o tienes una lesión?</p>
      <div role="group" aria-label="Zonas con limitación" className="flex flex-wrap gap-2">
        {JOINTS.map((joint) => (
          <Chip key={joint} pressed={chosen.includes(joint)} onToggle={() => toggle(joint)}>
            {JOINT_LABELS[joint]}
          </Chip>
        ))}
        <Chip pressed={noneChosen} onToggle={() => setLimitations([])}>
          Ninguna
        </Chip>
      </div>
      {needsZone ? (
        <Note tone="warn" role="status">
          Marca la zona que te molesta.
        </Note>
      ) : null}
    </WizardScreen>
  );
}
