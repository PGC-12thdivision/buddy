import { redirect } from "next/navigation";
import { safeReturnPath } from "@/lib/domain/subscription";
import { createClient } from "@/lib/supabase/server";
import { sessionUserId } from "@/lib/wizard/account";
import { Vuelta } from "./vuelta";

// Vuelta de Stripe Checkout (diseño D11; plan.md U9): cabecera normal, sin barra de pestañas. La URL
// solo dice si se canceló y a dónde volver; si se activa premium lo dice account_status.
export default async function Page({ searchParams }: PageProps<"/premium/vuelta">) {
  const userId = await sessionUserId(await createClient());
  if (!userId) redirect("/entrar");
  const params = await searchParams;
  return <Vuelta cancelled={params.estado === "cancelado"} volver={safeReturnPath(params.volver)} />;
}
