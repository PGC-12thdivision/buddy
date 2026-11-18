import type { Route } from "next";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { CtaLink } from "@/components/wizard/ui";
import { EndPop } from "@/components/session/end-pop";
import { loadActivePlan } from "@/lib/app/active-plan";
import { loadSessionScope } from "@/lib/app/session-guard";
import { exerciseHistory, formatKg, type LoggedSet } from "@/lib/domain/session";
import { createClient } from "@/lib/supabase/server";
import { sessionUserId } from "@/lib/wizard/account";

// Fin de sesión (diseño D7; dirección B, D59): la única portada de logro. Cifras de ejercicios y
// series; cada subida de carga con su "NIVEL ARRIBA"; la Molestia y lo saltado, en una línea sobria
// y sin animación. La duración es la real, no la estimada.

const COLUMNS = "session_id, exercise_id, set_index, weight_kg, reps, rir, status, created_at";

export default async function FinPage({ params }: PageProps<"/sesion/[id]/fin">) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const supabase = await createClient();
  const userId = await sessionUserId(supabase);
  if (!userId) redirect("/entrar");
  const scope = await loadSessionScope(supabase, userId, id);
  if (!scope) notFound();
  if (scope.session.open) redirect(`/sesion/${id}` as Route);

  const [{ data: session }, { data: planSession }, { data: rows }, { data: finished }, { data: states }, plan, { count }] = await Promise.all([
    supabase.from("workout_sessions").select("started_at, ended_at").eq("id", id).eq("user_id", userId).maybeSingle(),
    supabase.from("plan_sessions").select("label").eq("id", scope.session.planSessionId).maybeSingle(),
    // Series de esta sesión y el historial reciente, por debajo del máximo de filas de la API (1000).
    Promise.all([
      supabase.from("set_logs").select(COLUMNS).eq("user_id", userId).eq("session_id", id),
      supabase.from("set_logs").select(COLUMNS).eq("user_id", userId).neq("session_id", id).order("created_at", { ascending: false }).limit(900),
    ]).then(([today, recent]) => ({ data: [...(recent.data ?? []).reverse(), ...(today.data ?? [])] })),
    supabase.from("workout_sessions").select("id").eq("user_id", userId).not("ended_at", "is", null).order("started_at"),
    supabase.from("exercise_state").select("exercise_id, working_weight_kg, calibrated_at").eq("user_id", userId),
    loadActivePlan(supabase, userId),
    supabase.from("workout_sessions").select("id", { count: "exact", head: true }).eq("user_id", userId).not("ended_at", "is", null),
  ]);

  const sets: LoggedSet[] = (rows ?? []).map((s) => ({
    sessionId: s.session_id,
    exerciseId: s.exercise_id,
    setIndex: s.set_index,
    weightKg: Number(s.weight_kg),
    reps: s.reps,
    rir: s.rir,
    status: s.status as LoggedSet["status"],
    createdAt: s.created_at,
  }));
  const here = sets.filter((s) => s.sessionId === id);
  const names = new Map(scope.catalog.map((e) => [e.id, e.name]));
  const name = (exerciseId: string) => names.get(exerciseId) ?? exerciseId;
  const exerciseIds = [...new Set(here.map((s) => s.exerciseId))];
  const doneIds = exerciseIds.filter((e) => here.some((s) => s.exerciseId === e && s.status === "hecha"));
  const totalSets = here.filter((s) => s.status === "hecha").length;
  const started = session ? new Date(session.started_at) : null;
  const minutes = session?.ended_at && started ? Math.max(1, Math.round((new Date(session.ended_at).getTime() - started.getTime()) / 60000)) : null;
  const order = (finished ?? []).map((s) => s.id);
  const stateById = new Map((states ?? []).map((s) => [s.exercise_id, s]));

  const wins: { key: string; title: string; name: string; value: string }[] = [];
  const quiet: string[] = [];
  for (const exerciseId of exerciseIds) {
    const own = here.filter((s) => s.exerciseId === exerciseId);
    if (own.some((s) => s.status === "detenida")) {
      quiet.push(`${name(exerciseId)}: parado hoy. No sube carga.`);
      continue;
    }
    if (!own.some((s) => s.status === "hecha")) {
      quiet.push(`${name(exerciseId)}: saltado hoy. No cuenta y no penaliza.`);
      continue;
    }
    const state = stateById.get(exerciseId);
    if (state?.calibrated_at && started && new Date(state.calibrated_at) >= started && state.working_weight_kg !== null) {
      wins.push({ key: exerciseId, title: "Peso fijado", name: name(exerciseId), value: `${formatKg(Number(state.working_weight_kg))} kg` });
      continue;
    }
    const history = exerciseHistory(sets, exerciseId, order, new Set());
    const [prev, last] = history.slice(-2);
    if (prev && last && history.length >= 2 && last.loadKg > prev.loadKg && prev.loadKg > 0) {
      wins.push({ key: exerciseId, title: `Nivel arriba +${formatKg(last.loadKg - prev.loadKg)}`, name: name(exerciseId), value: `${formatKg(prev.loadKg)} → ${formatKg(last.loadKg)} kg` });
    }
  }
  const next = plan && plan.sessions.length > 0 ? plan.sessions[(count ?? 0) % plan.sessions.length] : null;
  const label = planSession?.label ?? "Sesión";

  return (
    <>
      <header className="wz-band wz-pad" data-cover="" aria-label="Marcador">
        <div className="flex min-h-11 items-center">
          <span className="wz-tag">Partida terminada</span>
        </div>
        <h1 className="wz-title">Sesión completada</h1>
        <p className="wz-subtitle">{minutes ? `${label}, ${minutes} minutos` : label}</p>
        <div className="wz-heroes">
          <div>
            <p className="wz-hero-label">Ejercicios</p>
            <p className="wz-hero-num" data-numeric="">
              {doneIds.length}
              <small>{`de ${scope.day.length}`}</small>
            </p>
          </div>
          <div>
            <p className="wz-hero-label">Series</p>
            <p className="wz-hero-num" data-numeric="">
              {totalSets}
            </p>
          </div>
        </div>
      </header>
      <div className="wz-stripes" aria-hidden="true" />
      <main className="wz-pad flex flex-1 flex-col gap-4 py-4" aria-label="Resumen de la sesión">
        {quiet.length > 0 ? (
          <section aria-label="Ejercicios parados o saltados" className="flex flex-col gap-1">
            {quiet.map((q) => (
              <p key={q} className="m-0 text-[15px] text-muted-foreground">
                {q}
              </p>
            ))}
          </section>
        ) : null}
        {wins.length > 0 ? (
          <section aria-labelledby="fin-logros">
            <h2 id="fin-logros" className="wz-rule-title">
              Lo que has ganado
            </h2>
            <ul className="m-0 list-none p-0">
              {wins.map((w, i) => (
                <li key={w.key} className="wz-num-row">
                  <span className="wz-num" aria-hidden="true">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="min-w-0 font-bold">{w.name}</span>
                  <span className="wz-num-val flex flex-col items-end gap-1">
                    <b>{w.value}</b>
                    <span className="wz-tag">{w.title}</span>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        {next ? (
          <section aria-labelledby="fin-siguiente">
            <h2 id="fin-siguiente" className="wz-rule-title">
              Lo que viene
            </h2>
            <p className="m-0 pt-3 text-[16px]">{`Próxima sesión: ${next.label.toLowerCase()}, ${next.slots.filter((s) => s.exerciseId).length} ejercicios.`}</p>
          </section>
        ) : null}
      </main>
      <div className="wz-foot wz-pad">
        <CtaLink href="/hoy">Volver a Hoy</CtaLink>
      </div>
      <EndPop />
    </>
  );
}
