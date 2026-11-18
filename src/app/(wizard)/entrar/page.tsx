import { EntrarForm } from "./form";

export default async function Entrar({ searchParams }: PageProps<"/entrar">) {
  return <EntrarForm invalidLink={(await searchParams).aviso === "enlace"} />;
}
