import { FocoStep } from "./step";

export default async function Foco({ searchParams }: PageProps<"/foco">) {
  return <FocoStep editing={(await searchParams).volver === "resumen"} />;
}
