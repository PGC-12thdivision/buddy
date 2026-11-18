import { WizardProvider } from "@/components/wizard/wizard-provider";
import { createClient } from "@/lib/supabase/server";
import { sessionUserId } from "@/lib/wizard/account";

// Wizard: sin barra de navegación, en una columna de 480 px sobre fondo morado en pantallas
// anchas (DESIGN.md §5).
export default async function WizardLayout({ children }: LayoutProps<"/">) {
  const userId = await sessionUserId(await createClient());
  return (
    <div className="wz-frame">
      <div className="wz-column">
        {/* La clave vuelve a montar el estado al cambiar de cuenta: limitaciones y cribado en
            memoria nunca pasan de una sesión a otra en la misma pestaña. */}
        <WizardProvider key={userId ?? "anonimo"} signedIn={userId !== null}>
          {children}
        </WizardProvider>
      </div>
    </div>
  );
}
