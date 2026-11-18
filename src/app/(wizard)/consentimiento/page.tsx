import { redirect } from "next/navigation";
import { requireWizardAccount } from "@/lib/wizard/guard";
import { nextScreenForAccount } from "@/lib/wizard/progress";
import { ConsentimientoForm } from "./form";

export default async function Consentimiento() {
  const { progress } = await requireWizardAccount("cuenta");
  if (progress.hasConsent) redirect(nextScreenForAccount(progress));
  return <ConsentimientoForm />;
}
