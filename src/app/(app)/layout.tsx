import { AppNav } from "@/components/nav/app-nav";
import { requireAppContext } from "@/lib/app/context";

// Estructura de la app tras el wizard (plan.md U6; DESIGN.md §5): contenido fluido en móvil,
// columna de 640 px en tablet y 1100 px junto al menú lateral desde 1024 px.
export default async function AppLayout({ children }: LayoutProps<"/">) {
  const { premium, trialDaysLeft } = await requireAppContext();
  const subscription =
    trialDaysLeft !== null && premium
      ? `Prueba premium: quedan ${trialDaysLeft} ${trialDaysLeft === 1 ? "día" : "días"}`
      : premium
        ? "Premium activo"
        : "Plan gratis";

  return (
    <div className="min-h-dvh bg-background pb-14 lg:pb-0 lg:pl-60">
      <AppNav subscription={subscription} />
      <div className="mx-auto flex min-h-dvh max-w-[640px] flex-col [container-type:inline-size] lg:max-w-[1100px]">{children}</div>
    </div>
  );
}
