import { AppScreen, Disclaimer } from "@/components/app/screen";
import { requireAppContext } from "@/lib/app/context";
import { JOINTS, type Joint } from "@/lib/domain/types";
import { LimitacionesAjustes } from "./form";

// Ajustes, Limitaciones (diseño D15; PRD §5 pantalla 8; guardarraíl 6): el mismo selector del wizard,
// sin texto libre. Solo con consentimiento vigente (requireAppContext lo exige y la acción lo vuelve
// a comprobar); al guardar, refiltrado determinista y gratis (D35). El cribado no se toca.
export default async function AjustesLimitaciones() {
  const { supabase, userId } = await requireAppContext();
  const { data } = await supabase.from("health_profile").select("limitations").eq("user_id", userId).maybeSingle();
  const current = (data?.limitations ?? []).filter((j): j is Joint => (JOINTS as readonly string[]).includes(j));

  return (
    <AppScreen kicker="Ajustes" title="Tus limitaciones" subtitle="Quitaremos los ejercicios que cargan estas zonas.">
      <Disclaimer />
      <LimitacionesAjustes initial={current} />
    </AppScreen>
  );
}
