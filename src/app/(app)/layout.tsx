import { AppNav } from "@/components/nav/app-nav";
import { ThemeSync } from "@/components/settings/theme-sync";
import { requireAppContext } from "@/lib/app/context";
import { parseTheme } from "@/lib/theme";

// Estructura de la app tras el wizard (plan.md U6; DESIGN.md §5): contenido fluido en móvil,
// columna de 640 px en tablet y 1100 px junto al menú lateral desde 1024 px.
export default async function AppLayout({ children }: LayoutProps<"/">) {
  const { supabase, userId, premium, trialDaysLeft } = await requireAppContext();
  const settings = await supabase.from("user_settings").select("theme").eq("user_id", userId).maybeSingle();
  const subscription =
    trialDaysLeft !== null && premium
      ? `Prueba premium: quedan ${trialDaysLeft} ${trialDaysLeft === 1 ? "día" : "días"}`
      : premium
        ? "Premium activo"
        : "Plan gratis";

  return (
    <div className="min-h-dvh bg-background pb-[calc(3.5rem+env(safe-area-inset-bottom))] lg:pb-0 lg:pl-60">
      {/* Solo con la lectura correcta: un fallo no cambia el tema que ya tiene el dispositivo. */}
      {settings.data ? <ThemeSync theme={parseTheme(settings.data.theme)} /> : null}
      <AppNav subscription={subscription} />
      <div className="mx-auto flex min-h-dvh max-w-[640px] flex-col [container-type:inline-size] lg:max-w-[1100px]">{children}</div>
    </div>
  );
}
