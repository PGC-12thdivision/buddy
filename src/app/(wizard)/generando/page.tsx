import { requireWizardAccount } from "@/lib/wizard/guard";
import { Generando } from "./generando";

export default async function Page() {
  await requireWizardAccount("cribado");
  return <Generando />;
}
