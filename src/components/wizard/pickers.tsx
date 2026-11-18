import { Chip, ChoiceCards, Icon } from "@/components/wizard/ui";
import type { EquipmentOption } from "@/lib/catalog";
import { JOINTS, type Joint } from "@/lib/domain/types";
import { FOCUS_LABELS, GYM_PRESET_LABELS, GYM_PRESETS, presetEquipment, type GymPreset, type WizardAnswers } from "@/lib/wizard/answers";
import { JOINT_LABELS, ZONE_LABELS } from "@/lib/wizard/zones";

// Selectores compartidos por el wizard (pantallas 2, 6 y 8) y por Ajustes (U11): misma interfaz y
// misma lógica en los dos sitios. Son controlados: el estado vive en quien los usa.

// --- Foco (pantalla 2) ---------------------------------------------------------------------------

const FOCUS_INFO: { value: WizardAnswers["focus"]; description: string; icon: string }[] = [
  { value: "equilibrado", description: "Un poco de todo: fuerza, músculo y forma", icon: "M12 4v16M7 20h10M4 7h16M4 7l-2.5 7h5zM20 7l-2.5 7h5z" },
  { value: "fuerza", description: "Un ejercicio principal pesado y el resto de apoyo", icon: "M2 12h20M5 8v8M8 5v14M16 5v14M19 8v8" },
  { value: "musculo", description: "Más series por grupo muscular", icon: "M5 9v6M8 6v12M16 6v12M19 9v6M8 12h8" },
  {
    value: "grasa",
    description: "Fuerza y cardio opcional. La dieta es la palanca principal",
    icon: "M12 3c1 4 6 6 6 11a6 6 0 0 1-12 0c0-3 1.5-5 3-6.5 0 2.5 1 4 3 4.5 0-3-1-6 0-9z",
  },
];

export function FocusPicker({ value, onChange }: { value: WizardAnswers["focus"] | undefined; onChange: (value: WizardAnswers["focus"]) => void }) {
  return (
    <ChoiceCards
      label="Tu foco"
      value={value}
      onChange={onChange}
      options={FOCUS_INFO.map((o) => ({ value: o.value, title: FOCUS_LABELS[o.value], description: o.description, icon: <Icon d={o.icon} /> }))}
    />
  );
}

// --- Mi gimnasio (pantalla 6): preset y después quitar por zona lo que no haya ---------------------

const PRESET_INFO: Record<GymPreset, { description: string; icon: string }> = {
  completo: { description: "Sala de máquinas, poleas, peso libre y cardio", icon: "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z" },
  basico: { description: "Algunas máquinas, mancuernas y cardio", icon: "M3 11l9-7 9 7v10H3zM9 21v-6h6v6" },
  peso_libre: { description: "Barras, mancuernas y bancos", icon: "M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18zM12 9a3 3 0 1 0 0 6a3 3 0 1 0 0-6z" },
};

export function EquipmentPicker({
  equipment,
  preset,
  selected,
  onChange,
}: {
  equipment: EquipmentOption[];
  preset: GymPreset | undefined;
  selected: string[];
  onChange: (value: { gymPreset: GymPreset; equipmentTypeIds: string[] }) => void;
}) {
  const allIds = equipment.map((e) => e.id);
  const zones = Object.keys(ZONE_LABELS).filter((zone) => equipment.some((e) => e.zone === zone));

  function toggle(id: string) {
    if (!preset) return;
    onChange({ gymPreset: preset, equipmentTypeIds: selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id] });
  }

  return (
    <>
      <ChoiceCards
        label="Tipo de gimnasio"
        value={preset}
        onChange={(p) => onChange({ gymPreset: p, equipmentTypeIds: presetEquipment(p, allIds) })}
        options={GYM_PRESETS.map((p) => ({
          value: p,
          title: GYM_PRESET_LABELS[p],
          description: PRESET_INFO[p].description,
          icon: <Icon d={PRESET_INFO[p].icon} />,
        }))}
      />
      {preset ? (
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
    </>
  );
}

// --- Limitaciones (pantalla 8): zonas con chips y "Ninguna" exclusiva, sin texto libre ---------------

// `value` null = aún sin elegir; [] = "Ninguna".
export function ZonePicker({ value, onChange }: { value: Joint[] | null; onChange: (value: Joint[]) => void }) {
  const chosen = value ?? [];
  const noneChosen = value !== null && value.length === 0;

  function toggle(joint: Joint) {
    onChange(chosen.includes(joint) ? chosen.filter((j) => j !== joint) : [...chosen, joint]);
  }

  return (
    <div role="group" aria-label="Zonas con limitación" className="flex flex-wrap gap-2">
      {JOINTS.map((joint) => (
        <Chip key={joint} pressed={chosen.includes(joint)} onToggle={() => toggle(joint)}>
          {JOINT_LABELS[joint]}
        </Chip>
      ))}
      <Chip pressed={noneChosen} onToggle={() => onChange([])}>
        Ninguna
      </Chip>
    </div>
  );
}
