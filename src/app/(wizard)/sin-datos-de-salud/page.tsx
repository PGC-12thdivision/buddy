import { requireWizardAccount } from "@/lib/wizard/guard";
import { SinDatosDeSalud } from "./exit";

export default async function Page() {
  await requireWizardAccount("cuenta");
  return <SinDatosDeSalud />;
}
