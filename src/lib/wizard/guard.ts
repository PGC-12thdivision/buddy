import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { accountProgress, sessionUserId } from "./account";
import { nextScreenForAccount } from "./progress";

// Pantallas del wizard que necesitan cuenta. Comprobación de la página (las Server Actions
// vuelven a comprobar la sesión por su cuenta, KTD15): sin sesión, a entrar; si aún no le toca
// esta pantalla, a la que le toca.
type Needs = "cuenta" | "consentimiento" | "cribado";

export async function requireWizardAccount(needs: Needs) {
  const supabase = await createClient();
  const userId = await sessionUserId(supabase);
  if (!userId) redirect("/entrar");
  const progress = await accountProgress(supabase, userId);
  const allowed =
    needs === "cuenta" ||
    (needs === "consentimiento" && progress.hasConsent) ||
    (needs === "cribado" && progress.hasConsent && progress.hasHealthProfile);
  if (!allowed) redirect(nextScreenForAccount(progress));
  return { supabase, userId, progress };
}
