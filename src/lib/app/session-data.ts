import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { CatalogExercise } from "@/lib/catalog";
import { calibrationStartLoad } from "@/lib/domain/calibration";
import { lightMatches } from "@/lib/domain/exclusion";
import { nextPrescription } from "@/lib/domain/progression";
import { calibrationState, exerciseHistory, type LoggedSet } from "@/lib/domain/session";
import type { EquipmentType, Experience, Joint } from "@/lib/domain/types";
import type { Database } from "@/lib/supabase/types";
import { loadSessionScope, type SlotRule } from "./session-guard";

// Carga entera de la sesión del día al empezar (PRD §9; diseño D29; plan.md U7): ejercicios,
// alternativas e historial. Todo con la sesión del usuario (RLS). La precarga de peso y repeticiones
// sale de las reglas deterministas en el servidor (guardarraíl 3); el cliente solo la muestra.

type Client = SupabaseClient<Database>;

export type ExerciseView = {
  exerciseId: string;
  name: string;
  equipmentName: string;
  sets: number;
  repMin: number;
  repMax: number;
  incrementKg: number;
  minKg: number;
  // Calibración (PRD §8; D63): ejercicio sin carga fijada. Objetivo de repeticiones y carga de inicio.
  calibration: null | { targetReps: number; startLoadKg: number };
  // Precarga: en calibración, la carga de la serie de prueba que toca.
  loadKg: number;
  reps: number;
  // Subida de carga por doble progresión ("NIVEL ARRIBA"), con la carga anterior.
  levelUpFromKg: number | null;
  // Técnica del catálogo (1–2 frases) y patrón y región, que eligen el dibujo de técnica.
  technique: string | null;
  pattern: string;
  region: string;
  // Aviso de contribución leve: solo si las limitaciones del usuario coinciden con joints_light.
  lightWarning: string | null;
};

const LIGHT_WARNING_FALLBACK = "Este ejercicio implica un poco una zona que marcaste. Carga ligera y recorrido cómodo. Si notas dolor, para y márcalo como molestia.";

// Aviso de contribución leve (regla de Pablo, 18/11): nunca excluye, solo avisa. Sin la zona en el texto
// genérico; la nota del catálogo dice qué vigilar.
export function lightWarningFor(exercise: CatalogExercise, limitations: readonly Joint[]): string | null {
  return lightMatches(exercise, limitations).length > 0 ? (exercise.lightNote ?? LIGHT_WARNING_FALLBACK) : null;
}

export type SessionSlotView = ExerciseView & { position: number; alternatives: ExerciseView[] };

export type SavedSet = {
  id: string;
  exerciseId: string;
  setIndex: number;
  weightKg: number;
  reps: number;
  rir: number | null;
  status: LoggedSet["status"];
};

export type SessionData = {
  id: string;
  kind: "calibracion" | "normal";
  label: string;
  startedAt: string;
  ended: boolean;
  slots: SessionSlotView[];
  saved: SavedSet[];
  showRest: boolean;
};

export const calibrationTarget = (repMin: number, repMax: number) => Math.round((repMin + repMax) / 2);

export async function loadSessionData(supabase: Client, userId: string, sessionId: string): Promise<SessionData | null> {
  const scope = await loadSessionScope(supabase, userId, sessionId);
  if (!scope) return null;

  // Historial solo de los ejercicios posibles hoy, los más recientes primero y por debajo del máximo
  // de filas de la API (1000). Las series de esta sesión van aparte: nunca se pierden (revisión de código).
  const dayExerciseIds = [...new Set(scope.day.flatMap((d) => [d.exerciseId, ...d.alternatives]))];
  const columns = "id, session_id, exercise_id, set_index, weight_kg, reps, rir, status, created_at";
  const [planSession, equipment, states, answers, history, today, marks, settings, finished] = await Promise.all([
    supabase.from("plan_sessions").select("label").eq("id", scope.session.planSessionId).maybeSingle(),
    supabase.from("equipment_types").select("id, name, increment_kg, min_kg"),
    supabase.from("exercise_state").select("exercise_id, working_weight_kg, increment_kg_override, calibrated_at").eq("user_id", userId),
    supabase.from("onboarding_answers").select("experience").eq("user_id", userId).maybeSingle(),
    supabase
      .from("set_logs")
      .select(columns)
      .eq("user_id", userId)
      .neq("session_id", sessionId)
      .in("exercise_id", dayExerciseIds.length ? dayExerciseIds : ["-"])
      .order("created_at", { ascending: false })
      .limit(900),
    supabase.from("set_logs").select(columns).eq("user_id", userId).eq("session_id", sessionId).order("set_index"),
    supabase.from("discomfort_marks").select("exercise_id, session_id").eq("user_id", userId),
    supabase.from("user_settings").select("show_rest_timer").eq("user_id", userId).maybeSingle(),
    // Sesiones cerradas anteriores, en orden: son el historial de la doble progresión.
    supabase.from("workout_sessions").select("id").eq("user_id", userId).not("ended_at", "is", null).neq("id", sessionId).order("started_at"),
  ]);
  if (!planSession.data || equipment.error || states.error || history.error || today.error) return null;

  const sessionOrder = (finished.data ?? []).map((s) => s.id);
  const equipmentById = new Map(
    (equipment.data ?? []).map((e) => [e.id, { name: e.name, incrementKg: Number(e.increment_kg), minKg: Number(e.min_kg) }]),
  );
  const stateById = new Map((states.data ?? []).map((s) => [s.exercise_id, s]));
  const experience = (answers.data?.experience ?? "6_meses_2_anos") as Experience;
  const rows = [...(history.data ?? []).reverse(), ...(today.data ?? [])];
  const allSets: (LoggedSet & { id: string })[] = rows.map((s) => ({
    id: s.id,
    sessionId: s.session_id,
    exerciseId: s.exercise_id,
    setIndex: s.set_index,
    weightKg: Number(s.weight_kg),
    reps: s.reps,
    rir: s.rir,
    status: s.status as LoggedSet["status"],
    createdAt: s.created_at,
  }));
  const marksByExercise = new Map<string, Set<string>>();
  for (const m of marks.data ?? []) {
    marksByExercise.set(m.exercise_id, (marksByExercise.get(m.exercise_id) ?? new Set()).add(m.session_id));
  }
  const byId = new Map(scope.catalog.map((e) => [e.id, e]));

  const view = (exercise: CatalogExercise, rule: SlotRule): ExerciseView | null => {
    const eq = equipmentById.get(exercise.equipmentTypeId);
    if (!eq) return null;
    const state = stateById.get(exercise.id);
    const increment = state?.increment_kg_override ? Number(state.increment_kg_override) : eq.incrementKg;
    const machine: EquipmentType = { id: exercise.equipmentTypeId, incrementKg: increment, minKg: eq.minKg };
    const base = {
      exerciseId: exercise.id,
      name: exercise.name,
      equipmentName: eq.name,
      sets: rule.sets,
      repMin: rule.repMin,
      repMax: rule.repMax,
      incrementKg: increment,
      minKg: eq.minKg,
      technique: exercise.technique,
      pattern: exercise.pattern,
      region: exercise.region,
      lightWarning: lightWarningFor(exercise, scope.limitations),
    };

    // Sin carga fijada, o fijada en esta misma sesión: es su calibración (D63).
    const calibratedHere = state?.calibrated_at && new Date(state.calibrated_at) >= new Date(scope.session.startedAt);
    if (!state?.calibrated_at || state.working_weight_kg === null || calibratedHere) {
      const startLoadKg = calibrationStartLoad(exercise.calibrationLoadKg, machine, experience);
      const targetReps = calibrationTarget(rule.repMin, rule.repMax);
      const own = allSets.filter((s) => s.sessionId === sessionId && s.exerciseId === exercise.id && s.status === "hecha");
      const cal = calibrationState(own, startLoadKg, targetReps, machine);
      const loadKg = cal.done ? cal.fixedLoadKg : cal.nextLoadKg;
      return { ...base, calibration: { targetReps, startLoadKg }, loadKg, reps: targetReps, levelUpFromKg: null };
    }

    const current = Number(state.working_weight_kg);
    const hist = exerciseHistory(allSets, exercise.id, sessionOrder, marksByExercise.get(exercise.id) ?? new Set());
    const next = nextPrescription({ currentLoadKg: current, repRange: { min: rule.repMin, max: rule.repMax }, history: hist }, machine);
    return { ...base, calibration: null, loadKg: next.loadKg, reps: next.reps, levelUpFromKg: next.loadKg > current ? current : null };
  };

  const slots: SessionSlotView[] = [];
  for (const item of scope.day) {
    const alternatives = item.alternatives
      .map((id) => byId.get(id))
      .filter((e): e is CatalogExercise => e !== undefined)
      .map((e) => view(e, item.rule))
      .filter((v): v is ExerciseView => v !== null);
    const exercise = byId.get(item.exerciseId);
    const main = exercise && scope.allowed.has(item.exerciseId) ? view(exercise, item.rule) : null;
    // Si hoy ya se cambió el ejercicio por una alternativa con series, se retoma esa (revisión de código).
    const swapped = alternatives.find((a) => allSets.some((s) => s.sessionId === sessionId && s.exerciseId === a.exerciseId));
    // Si el ejercicio del plan ya no encaja con las limitaciones, se ofrece su primera alternativa.
    const shown = swapped ?? main ?? alternatives[0];
    if (!shown) continue;
    slots.push({
      ...shown,
      position: item.rule.position,
      alternatives: [...(main && main !== shown ? [main] : []), ...alternatives.filter((a) => a.exerciseId !== shown.exerciseId)],
    });
  }

  return {
    id: scope.session.id,
    kind: scope.session.kind,
    label: planSession.data.label,
    startedAt: scope.session.startedAt,
    ended: !scope.session.open,
    slots,
    saved: allSets
      .filter((s) => s.sessionId === sessionId)
      .map(({ id, exerciseId, setIndex, weightKg, reps, rir, status }) => ({ id, exerciseId, setIndex, weightKg, reps, rir, status })),
    showRest: settings.data?.show_rest_timer ?? true,
  };
}
