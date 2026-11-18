import { EntrarForm } from "./form";

export default async function Entrar({ searchParams }: PageProps<"/entrar">) {
  const { aviso } = await searchParams;
  return <EntrarForm notice={aviso === "enlace" || aviso === "confirmado" ? aviso : null} />;
}
