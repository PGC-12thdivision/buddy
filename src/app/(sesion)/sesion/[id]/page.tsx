import type { Route } from "next";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { SessionRunner } from "@/components/session/session-runner";
import { loadSessionData } from "@/lib/app/session-data";
import { createClient } from "@/lib/supabase/server";
import { sessionUserId } from "@/lib/wizard/account";

// Sesión del día (plan.md U7). Se carga entera al empezar (diseño D29). Una sesión que no es del
// usuario responde igual que una que no existe.
export default async function SesionPage({ params }: PageProps<"/sesion/[id]">) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const supabase = await createClient();
  const userId = await sessionUserId(supabase);
  if (!userId) redirect("/entrar");

  const data = await loadSessionData(supabase, userId, id);
  if (!data) notFound();
  if (data.ended) redirect(`/sesion/${id}/fin` as Route);
  return <SessionRunner data={data} />;
}
