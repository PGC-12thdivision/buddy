import { SemanaStep } from "./step";

export default async function Semana({ searchParams }: PageProps<"/semana">) {
  return <SemanaStep editing={(await searchParams).volver === "resumen"} />;
}
