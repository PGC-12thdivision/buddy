"use client";

import { Chip, ChoiceCards, Cta, Icon, Note, WizardScreen } from "@/components/wizard/ui";
import { useStepNext } from "@/components/wizard/use-step-next";
import { useStepView, useWizard } from "@/components/wizard/wizard-provider";
import { ZONE_LABELS } from "@/lib/wizard/zones";
import type { EquipmentOption } from "@/lib/catalog";
import { GYM_PRESET_LABELS, GYM_PRESETS, presetEquipment, type GymPreset } from "@/lib/wizard/answers";

// Pantalla 6, "Mi gimnasio" (PRD §5 y §6): preset y después quitar por zona lo que no haya.
const PRESET_INFO: Record<GymPreset, { description: string; icon: string }> = {
  completo: { description: "Sala de máquinas, poleas, peso libre y cardio", icon: "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z" },
  basico: { description: "Algunas máquinas, mancuernas y cardio", icon: "M3 11l9-7 9 7v10H3zM9 21v-6h6v6" },
  peso_libre: { description: "Barras, mancuernas y bancos", icon: "M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18zM12 9a3 3 0 1 0 0 6a3 3 0 1 0 0-6z" },
};

export function GimnasioStep({ equipment, editing }: { equipment: EquipmentOption[]; editing: boolean }) {
  useStepView("gimnasio");
  const { draft, setAnswers } = useWizard();
  const { next, pending, error } = useStepNext("gimnasio", "/registro", editing);
  const { gymPreset } = draft.answers;
  const selected = draft.answers.equipmentTypeIds ?? [];
  const allIds = equipment.map((e) => e.id);
  const zones = Object.keys(ZONE_LABELS).filter((zone) => equipment.some((e) => e.zone === zone));
  const complete = gymPreset !== undefined && selected.length > 0;

  function choosePreset(preset: GymPreset) {
    setAnswers({ gymPreset: preset, equipmentTypeIds: presetEquipment(preset, allIds) });
  }

  function toggle(id: string) {
    setAnswers({ equipmentTypeIds: selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id] });
  }

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
      <ChoiceCards
        label="Tipo de gimnasio"
        value={gymPreset}
        onChange={choosePreset}
        options={GYM_PRESETS.map((p) => ({
          value: p,
          title: GYM_PRESET_LABELS[p],
          description: PRESET_INFO[p].description,
          icon: <Icon d={PRESET_INFO[p].icon} />,
        }))}
      />
      {gymPreset ? (
        <>
          <p className="wz-help" role="status">
            <b className="text-foreground">{`${selected.length} de ${equipment.length}`}</b> tipos de equipo marcados. Toca para quitar o añadir.
          </p>
          {zones.map((zone) => {
            const items = equipment.filter((e) => e.zone === zone);
            const count = items.filter((e) => selected.includes(e.id)).length;
            return (
              <details key={zone} className="rounded-md border-2 border-border bg-card px-3 py-1">
                <summary className="flex min-h-11 cursor-pointer items-center justify-between font-extrabold">
                  {ZONE_LABELS[zone] ?? zone}
                  <small className="font-semibold text-muted-foreground">{`${count} de ${items.length}`}</small>
                </summary>
                <div className="flex flex-wrap gap-2 pb-3 pt-1">
                  {items.map((e) => (
                    <Chip key={e.id} pressed={selected.includes(e.id)} onToggle={() => toggle(e.id)}>
                      {e.name}
                    </Chip>
                  ))}
                </div>
              </details>
            );
          })}
        </>
      ) : null}
      {gymPreset && selected.length === 0 ? (
        <Note tone="warn" role="status">
          Marca al menos un tipo de equipo para poder montarte el plan.
        </Note>
      ) : null}
      {error ? <Note tone="danger" role="alert">{error}</Note> : null}
    </WizardScreen>
  );
}
