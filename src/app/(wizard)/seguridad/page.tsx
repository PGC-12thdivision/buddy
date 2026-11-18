import { requireWizardAccount } from "@/lib/wizard/guard";
import { SeguridadStep } from "./step";

export default async function Seguridad() {
  await requireWizardAccount("consentimiento");
  return <SeguridadStep />;
}
