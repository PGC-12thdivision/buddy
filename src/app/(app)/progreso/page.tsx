import { AppScreen, WeekStrip } from "@/components/app/screen";
import { CtaLink } from "@/components/wizard/ui";
import { requireAppContext } from "@/lib/app/context";
import { exerciseHistory, formatKg, type LoggedSet } from "@/lib/domain/session";

// Progreso (plan.md U6 y U7; dirección B, D59): portada con la mayor subida de carga, siempre con
// datos reales (diseño D17: "PRENSA: +15 KG"), y la lista de cargas de trabajo por ejercicio. Las
// gráficas completas son premium (D32) y llegan después de la línea de corte.
export default async function ProgresoPage() {
  const { supabase, userId, plan } = await requireAppContext();
  const [{ data: sessions }, { data: rows }, { data: states }, { data: exercises }] = await Promise.all([
    supabase.from("workout_sessions").select("id").eq("user_id", userId).not("ended_at", "is", null).order("started_at"),
    // Lo más reciente, por debajo del máximo de filas de la API (1000).
    supabase
      .from("set_logs")
      .select("session_id, exercise_id, set_index, weight_kg, reps, rir, status, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(900),
    supabase.from("exercise_state").select("exercise_id, working_weight_kg").eq("user_id", userId).not("working_weight_kg", "is", null),
    supabase.from("exercises").select("id, name"),
  ]);
  const order = (sessions ?? []).map((s) => s.id);

  if (order.length === 0) {
    return (
      <AppScreen title="Progreso" subtitle="Aquí verás cómo sube tu peso, sesión a sesión.">
        <div className="relative flex flex-1 flex-col items-center justify-center gap-5 overflow-hidden py-8 text-center">
          <span className="wz-watermark" aria-hidden="true">
            B
          </span>
          <h2 className="relative m-0 font-display text-2xl font-black uppercase italic [font-stretch:125%]">Aún no hay partida</h2>
          <div className="relative w-full max-w-xs">
            <WeekStrip days={plan.daysPerWeek} done={0} />
          </div>
          <p className="wz-help relative m-0 text-[15px]">Tu peso de trabajo aparecerá aquí después de tu primera sesión.</p>
          <div className="relative w-full max-w-sm">
            <CtaLink href="/hoy">Ir a Hoy</CtaLink>
          </div>
        </div>
      </AppScreen>
    );
  }

  const names = new Map((exercises ?? []).map((e) => [e.id, e.name]));
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
  // Por ejercicio: primera carga registrada y carga de trabajo actual.
  const items = (states ?? [])
    .map((s) => {
      const history = exerciseHistory(sets, s.exercise_id, order, new Set()).filter((h) => h.loadKg > 0);
      const first = history[0]?.loadKg ?? Number(s.working_weight_kg);
      const now = Number(s.working_weight_kg);
      return { id: s.exercise_id, name: names.get(s.exercise_id) ?? s.exercise_id, first, now, gain: now - first, sessions: history.length };
    })
    .sort((a, b) => b.gain - a.gain || a.name.localeCompare(b.name, "es"));
  const best = items[0];
  const hero = best && best.gain > 0;

  return (
    <AppScreen
      kicker={`${order.length} ${order.length === 1 ? "sesión hecha" : "sesiones hechas"}`}
      title={hero ? best.name : "Progreso"}
      subtitle={hero ? `De ${formatKg(best.first)} a ${formatKg(best.now)} kg desde tu calibración.` : "Las subidas llegan cuando completas el rango dos sesiones seguidas."}
      heroes={[hero ? { label: "Mayor subida", value: `+${formatKg(best.gain)}`, unit: "kg" } : { label: "Sesiones", value: String(order.length) }]}
    >
      <section aria-labelledby="progreso-cargas">
        <h2 id="progreso-cargas" className="wz-rule-title">
          Tus cargas de trabajo
        </h2>
        <ol className="m-0 list-none p-0">
          {items.map((item, i) => (
            <li key={item.id} className="wz-num-row">
              <span className="wz-num" aria-hidden="true">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="min-w-0 font-bold">{item.name}</span>
              <span className="wz-num-val">
                <b>{`${formatKg(item.now)} kg`}</b>
                <span>{item.gain > 0 ? `+${formatKg(item.gain)} kg` : item.gain < 0 ? `${formatKg(item.gain)} kg` : "sin cambios"}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>
    </AppScreen>
  );
}
