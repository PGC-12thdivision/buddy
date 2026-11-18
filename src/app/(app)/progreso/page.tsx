import { AppScreen } from "@/components/app/screen";
import { CtaLink } from "@/components/wizard/ui";
import { requireAppContext } from "@/lib/app/context";

// Progreso (plan.md U6): la gráfica básica necesita sesiones registradas (U7). Hasta entonces,
// vacío con marca de agua y una acción (DESIGN.md §6).
export default async function ProgresoPage() {
  await requireAppContext();
  return (
    <AppScreen title="Progreso">
      <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden py-10 text-center">
        <span className="wz-watermark" aria-hidden="true">
          B
        </span>
        <h2 className="relative m-0 font-display text-2xl font-black uppercase italic [font-stretch:125%]">Aún no hay partida</h2>
        <p className="wz-help relative mb-5 mt-2 text-[15px]">Tu peso de trabajo aparecerá aquí después de tu primera sesión.</p>
        <div className="relative w-full max-w-sm">
          <CtaLink href="/hoy">Ir a Hoy</CtaLink>
        </div>
      </div>
    </AppScreen>
  );
}
