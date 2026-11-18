import { WizardProvider } from "@/components/wizard/wizard-provider";
import { createClient } from "@/lib/supabase/server";
import { sessionUserId } from "@/lib/wizard/account";

// Wizard: sin barra de navegación, en una columna de 480 px sobre fondo morado en pantallas
// anchas (DESIGN.md §5).
export default async function WizardLayout({ children }: LayoutProps<"/">) {
  const signedIn = (await sessionUserId(await createClient())) !== null;
  return (
    <div className="wz-frame">
      <div className="wz-column">
        <WizardProvider signedIn={signedIn}>{children}</WizardProvider>
      </div>
    </div>
  );
}
