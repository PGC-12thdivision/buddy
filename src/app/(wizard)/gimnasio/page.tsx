import { equipmentCatalog } from "@/lib/catalog";
import { GimnasioStep } from "./step";

export default async function Gimnasio({ searchParams }: PageProps<"/gimnasio">) {
  const [equipment, params] = await Promise.all([equipmentCatalog(), searchParams]);
  return <GimnasioStep equipment={equipment} editing={params.volver === "resumen"} />;
}
