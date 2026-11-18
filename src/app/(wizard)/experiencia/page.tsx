import { ExperienciaStep } from "./step";

export default async function Experiencia({ searchParams }: PageProps<"/experiencia">) {
  return <ExperienciaStep editing={(await searchParams).volver === "resumen"} />;
}
