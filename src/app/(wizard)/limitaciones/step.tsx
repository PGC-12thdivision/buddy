"use client";

import { useRouter } from "next/navigation";
import { ZonePicker } from "@/components/wizard/pickers";
import { Cta, Note, WizardScreen } from "@/components/wizard/ui";
import { useStepView, useWizard } from "@/components/wizard/wizard-provider";

// Pantalla 8 (sistema §11.12; guardarraíl 6): zonas con chips y "Ninguna" exclusiva, sin texto
// libre. Se guardan en memoria y se envían junto con el cribado, con consentimiento vigente. El
// selector es el mismo que usa Ajustes (U11).
export function LimitacionesStep() {
  useStepView("limitaciones");
  const router = useRouter();
  const { limitations, setLimitations, screening, track } = useWizard();
  // Si el cribado articular ya dijo "Sí", hace falta al menos una zona.
  const needsZone = screening.articular === true && (limitations ?? []).length === 0;

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
      <ZonePicker value={limitations} onChange={setLimitations} />
      {needsZone ? (
        <Note tone="warn" role="status">
          Marca la zona que te molesta.
        </Note>
      ) : null}
    </WizardScreen>
  );
}
