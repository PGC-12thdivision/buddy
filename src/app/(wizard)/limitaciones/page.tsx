import { requireWizardAccount } from "@/lib/wizard/guard";
import { LimitacionesStep } from "./step";

export default async function Limitaciones() {
  await requireWizardAccount("consentimiento");
  return <LimitacionesStep />;
}
