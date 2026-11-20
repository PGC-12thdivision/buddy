"use client";

import { EquipmentPicker } from "@/components/wizard/pickers";
import { Cta, Note, WizardScreen } from "@/components/wizard/ui";
import { useStepNext } from "@/components/wizard/use-step-next";
import { useStepView, useWizard } from "@/components/wizard/wizard-provider";
import type { EquipmentOption } from "@/lib/catalog";

// Pantalla 6, "Mi gimnasio" (PRD §5 y §6): preset y después quitar por zona lo que no haya. El
// selector es el mismo que usa Ajustes (U11).
export function GimnasioStep({ equipment, editing }: { equipment: EquipmentOption[]; editing: boolean }) {
  useStepView("gimnasio");
  const { draft, setAnswers } = useWizard();
  const { next, pending, error } = useStepNext("gimnasio", "/registro", editing);
  const { gymPreset } = draft.answers;
  const selected = draft.answers.equipmentTypeIds ?? [];
  const complete = gymPreset !== undefined && selected.length > 0;

  return (
    <WizardScreen
      step={6}
      backHref={editing ? "/resumen" : "/deportes"}
      title="Mi gimnasio"
      subtitle="Elige lo más parecido y quita lo que no tengas."
      footer={
        <>
          <Cta
            disabled={!complete || pending}
            onClick={() => complete && next({ gymPreset, equipmentTypeIds: selected })}
          >
            {editing ? "Guardar" : "Siguiente"}
          </Cta>
          {editing ? null : <p className="wz-help text-center">Después: crear tu cuenta, consentimiento y limitaciones</p>}
        </>
      }
    >
      <EquipmentPicker equipment={equipment} preset={gymPreset} selected={selected} onChange={setAnswers} />
      {gymPreset && selected.length === 0 ? (
        <Note tone="warn" role="status">
          Marca al menos un tipo de equipo para poder montarte el plan.
        </Note>
      ) : null}
      {error ? <Note tone="danger" role="alert">{error}</Note> : null}
    </WizardScreen>
  );
}
