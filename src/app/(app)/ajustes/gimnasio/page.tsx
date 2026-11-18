import { AppScreen } from "@/components/app/screen";
import { requireAppContext } from "@/lib/app/context";
import { equipmentCatalog } from "@/lib/catalog";
import { GYM_PRESETS, type GymPreset } from "@/lib/wizard/answers";
import { GimnasioAjustes } from "./form";

// Ajustes, Mi gimnasio (diseño D15; PRD §5 pantalla 6): el mismo selector del wizard. Al guardar,
// refiltrado determinista y gratis (D35).
export default async function AjustesGimnasio() {
  const { supabase, userId } = await requireAppContext();
  const [equipment, gym] = await Promise.all([
    equipmentCatalog(),
    supabase.from("gym_profiles").select("preset, equipment_type_ids").eq("user_id", userId).maybeSingle(),
  ]);
  const known = new Set(equipment.map((e) => e.id));
  const stored = gym.data?.preset as GymPreset | undefined;
  const preset = stored && GYM_PRESETS.includes(stored) ? stored : undefined;

  return (
    <AppScreen kicker="Ajustes" title="Mi gimnasio" subtitle="Quita lo que no tengas o añade lo que falte.">
      <GimnasioAjustes
        equipment={equipment}
        initialPreset={preset}
        initialSelected={(gym.data?.equipment_type_ids ?? []).filter((id) => known.has(id))}
      />
    </AppScreen>
  );
}
