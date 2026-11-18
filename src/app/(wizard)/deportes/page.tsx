import { activityCatalog } from "@/lib/catalog";
import { DeportesStep } from "./step";

export default async function Deportes({ searchParams }: PageProps<"/deportes">) {
  const [activities, params] = await Promise.all([activityCatalog(), searchParams]);
  return <DeportesStep activities={activities} editing={params.volver === "resumen"} />;
}
