"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { loadActivePlan } from "@/lib/app/active-plan";
import { calibrationTarget } from "@/lib/app/session-data";
import { loadSessionScope, type SessionScope } from "@/lib/app/session-guard";
import { refilterForUser } from "@/lib/app/refilter-core";
import { calibrationStartLoad } from "@/lib/domain/calibration";
import { calibrationState, isRepeatedDiscomfort, workingWeightAfter, type CalibrationState, type LoggedSet } from "@/lib/domain/session";
import { JOINTS, type Experience, type Joint } from "@/lib/domain/types";
import { logError } from "@/lib/log";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { hasActiveConsent, sessionUserId } from "@/lib/wizard/account";

// Sesión del día (plan.md U7; KTD11, KTD15–KTD17; D63–D67). Cada acción saca el user_id de los
// claims y comprueba la sesión con loadSessionScope. Los errores son códigos fijos: nunca el
// ejercicio, la zona ni el mensaje crudo (KTD17). La Molestia no deja eventos de analítica (KTD14).

type Fail<E extends string = "sin_sesion" | "no_valido" | "fallo"> = { ok: false; error: E | "sin_sesion" };

const STALE_MS = 12 * 60 * 60 * 1000;
const DETENIDA_INDEX = 100;
const uuid = z.string().uuid();

async function claims() {
  const supabase = await createClient();
  const userId = await sessionUserId(supabase);
  return { supabase, userId };
}

// --- Empezar ---------------------------------------------------------------------------------

// Abre la sesión que toca hoy o retoma la abierta. Una sola abierta por usuario (índice único).
export async function empezarSesion(): Promise<Fail<"sin_plan" | "fallo">> {
  const { supabase, userId } = await claims();
  if (!userId) return { ok: false, error: "sin_sesion" };

  const { data: open } = await supabase
    .from("workout_sessions")
    .select("id, started_at")
    .eq("user_id", userId)
    .is("ended_at", null)
    .maybeSingle();
  if (open && Date.now() - new Date(open.started_at).getTime() < STALE_MS) redirect(`/sesion/${open.id}`);
  if (open) {
    // Una sesión olvidada de hace más de 12 h se cierra tal cual, sin tocar cargas; si no tiene
    // ninguna serie, se borra para que no haga avanzar el día del plan (revisión de código).
    const { count: rows } = await supabase.from("set_logs").select("id", { count: "exact", head: true }).eq("session_id", open.id).eq("user_id", userId);
    if (rows === 0) await createAdminClient().from("workout_sessions").delete().eq("id", open.id).eq("user_id", userId);
    else await supabase.from("workout_sessions").update({ ended_at: new Date().toISOString() }).eq("id", open.id).eq("user_id", userId);
  }

  const plan = await loadActivePlan(supabase, userId);
  if (!plan || plan.sessions.length === 0) return { ok: false, error: "sin_plan" };
  const { count } = await supabase
    .from("workout_sessions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .not("ended_at", "is", null);
  const next = plan.sessions[(count ?? 0) % plan.sessions.length];
  // El día del plan se lee con el cliente del usuario: la clave foránea no pasa por la RLS.
  const { data: planSession } = await supabase
    .from("plan_sessions")
    .select("id")
    .eq("plan_id", plan.id)
    .eq("user_id", userId)
    .eq("day_index", next.dayIndex)
    .maybeSingle();
  if (!planSession) return { ok: false, error: "fallo" };

  const ids = next.slots.map((s) => s.exerciseId).filter((id): id is string => id !== null);
  const { data: states } = await supabase.from("exercise_state").select("exercise_id, calibrated_at").eq("user_id", userId).in("exercise_id", ids);
  const calibrated = new Set((states ?? []).filter((s) => s.calibrated_at).map((s) => s.exercise_id));
  const kind = ids.some((id) => !calibrated.has(id)) ? "calibracion" : "normal";

  const id = crypto.randomUUID();
  const { error } = await supabase.from("workout_sessions").insert({ id, user_id: userId, plan_session_id: planSession.id, kind });
  if (error) {
    // Doble toque: la otra petición ya abrió la sesión.
    if (error.code === "23505") {
      const { data: again } = await supabase.from("workout_sessions").select("id").eq("user_id", userId).is("ended_at", null).maybeSingle();
      if (again) redirect(`/sesion/${again.id}`);
    }
    logError("empezar_sesion", error);
    return { ok: false, error: "fallo" };
  }
  redirect(`/sesion/${id}`);
}

// --- Series ----------------------------------------------------------------------------------

const serieSchema = z.object({
  id: uuid,
  sessionId: uuid,
  exerciseId: z.string().min(1).max(80),
  setIndex: z.number().int().min(1).max(20),
  weightKg: z.number().min(0).max(500),
  reps: z.number().int().min(0).max(100),
  rir: z.number().int().min(0).max(4).nullable(),
  status: z.enum(["hecha", "saltada"]),
});

export type SerieResult = { ok: true; calibration: CalibrationState | null } | Fail<"no_valido" | "duplicada" | "cerrada" | "fallo">;

// Carga de calibración del ejercicio recalculada en el servidor con sus series guardadas; si queda
// fijada, se guarda en exercise_state (guardarraíl 3: el cliente nunca fija una carga).
async function syncCalibration(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  scope: SessionScope,
  exerciseId: string,
): Promise<CalibrationState | null> {
  const exercise = scope.catalog.find((e) => e.id === exerciseId);
  const rule = scope.allowed.get(exerciseId);
  if (!exercise || !rule) return null;
  const [equipment, state, answers, sets] = await Promise.all([
    supabase.from("equipment_types").select("increment_kg, min_kg").eq("id", exercise.equipmentTypeId).maybeSingle(),
    supabase.from("exercise_state").select("calibrated_at, increment_kg_override").eq("user_id", userId).eq("exercise_id", exerciseId).maybeSingle(),
    supabase.from("onboarding_answers").select("experience").eq("user_id", userId).maybeSingle(),
    supabase
      .from("set_logs")
      .select("set_index, weight_kg, reps, rir, status")
      .eq("session_id", scope.session.id)
      .eq("user_id", userId)
      .eq("exercise_id", exerciseId),
  ]);
  if (!equipment.data) return null;
  // Calibrado en una sesión anterior: ya no es calibración.
  if (state.data?.calibrated_at && new Date(state.data.calibrated_at) < new Date(scope.session.startedAt)) return null;

  const machine = {
    id: exercise.equipmentTypeId,
    incrementKg: state.data?.increment_kg_override ? Number(state.data.increment_kg_override) : Number(equipment.data.increment_kg),
    minKg: Number(equipment.data.min_kg),
  };
  const start = calibrationStartLoad(exercise.calibrationLoadKg, machine, (answers.data?.experience ?? "6_meses_2_anos") as Experience);
  const done = (sets.data ?? [])
    .filter((s) => s.status === "hecha")
    .map((s) => ({ setIndex: s.set_index, weightKg: Number(s.weight_kg), reps: s.reps, rir: s.rir }));
  const result = calibrationState(done, start, calibrationTarget(rule.repMin, rule.repMax), machine);

  const write = result.done
    ? { working_weight_kg: result.fixedLoadKg, calibrated_at: new Date().toISOString() }
    : { working_weight_kg: null, calibrated_at: null };
  // La carga la escribe solo el servidor (el usuario no tiene permiso de escritura en exercise_state).
  const { error } = await createAdminClient()
    .from("exercise_state")
    .upsert({ user_id: userId, exercise_id: exerciseId, ...write }, { onConflict: "user_id,exercise_id" });
  if (error) logError("calibracion_estado", error);
  return result;
}

export async function guardarSerie(input: unknown): Promise<SerieResult> {
  const parsed = serieSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "no_valido" };
  const { supabase, userId } = await claims();
  if (!userId) return { ok: false, error: "sin_sesion" };
  const v = parsed.data;

  const scope = await loadSessionScope(supabase, userId, v.sessionId);
  if (!scope) return { ok: false, error: "no_valido" };
  if (!scope.session.open) return { ok: false, error: "cerrada" };
  if (!scope.allowed.has(v.exerciseId)) return { ok: false, error: "no_valido" };

  const row = {
    id: v.id,
    user_id: userId,
    session_id: v.sessionId,
    exercise_id: v.exerciseId,
    set_index: v.setIndex,
    weight_kg: v.weightKg,
    reps: v.reps,
    rir: v.rir,
    status: v.status,
  };
  // Inserción idempotente: el reintento con el mismo ID no hace nada (KTD11). Nunca fusiona.
  const { error } = await supabase.from("set_logs").upsert(row, { onConflict: "id", ignoreDuplicates: true });
  if (error) {
    if (error.code === "23505") return { ok: false, error: "duplicada" };
    logError("guardar_serie", error);
    return { ok: false, error: "fallo" };
  }
  // Se relee bajo RLS: si el ID ya existía con otros datos, no se da por guardada.
  const { data: stored } = await supabase.from("set_logs").select("session_id, exercise_id, set_index").eq("id", v.id).maybeSingle();
  if (!stored || stored.session_id !== v.sessionId || stored.exercise_id !== v.exerciseId || stored.set_index !== v.setIndex) {
    return { ok: false, error: "duplicada" };
  }

  const calibration = v.rir !== null ? await syncCalibration(supabase, userId, scope, v.exerciseId) : null;
  return { ok: true, calibration };
}

const editarSchema = z.object({
  id: uuid,
  sessionId: uuid,
  weightKg: z.number().min(0).max(500),
  reps: z.number().int().min(0).max(100),
  rir: z.number().int().min(0).max(4).nullable(),
});

// Corregir una serie (diseño D8) mientras la sesión está abierta. El servidor recalcula la calibración.
export async function editarSerie(input: unknown): Promise<SerieResult> {
  const parsed = editarSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "no_valido" };
  const { supabase, userId } = await claims();
  if (!userId) return { ok: false, error: "sin_sesion" };
  const v = parsed.data;

  const scope = await loadSessionScope(supabase, userId, v.sessionId);
  if (!scope) return { ok: false, error: "no_valido" };
  if (!scope.session.open) return { ok: false, error: "cerrada" };
  const { data: row, error } = await supabase
    .from("set_logs")
    .update({ weight_kg: v.weightKg, reps: v.reps, rir: v.rir })
    .eq("id", v.id)
    .eq("session_id", v.sessionId)
    .eq("user_id", userId)
    .select("exercise_id, rir")
    .maybeSingle();
  if (error || !row) {
    if (error) logError("editar_serie", error);
    return { ok: false, error: "fallo" };
  }
  const calibration = row.rir !== null ? await syncCalibration(supabase, userId, scope, row.exercise_id) : null;
  return { ok: true, calibration };
}

const borrarSchema = z.object({ id: uuid, sessionId: uuid });

// Deshacer (diseño D8): borra la serie recién guardada y, si era de calibración, la recalcula.
export async function borrarSerie(input: unknown): Promise<SerieResult> {
  const parsed = borrarSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "no_valido" };
  const { supabase, userId } = await claims();
  if (!userId) return { ok: false, error: "sin_sesion" };
  const v = parsed.data;

  const scope = await loadSessionScope(supabase, userId, v.sessionId);
  if (!scope) return { ok: false, error: "no_valido" };
  if (!scope.session.open) return { ok: false, error: "cerrada" };
  const { data: row, error } = await supabase
    .from("set_logs")
    .delete()
    .eq("id", v.id)
    .eq("session_id", v.sessionId)
    .eq("user_id", userId)
    .select("exercise_id, rir")
    .maybeSingle();
  if (error) {
    logError("borrar_serie", error);
    return { ok: false, error: "fallo" };
  }
  const calibration = row && row.rir !== null ? await syncCalibration(supabase, userId, scope, row.exercise_id) : null;
  return { ok: true, calibration };
}

// --- Molestia --------------------------------------------------------------------------------

const molestiaSchema = z.object({ sessionId: uuid, exerciseId: z.string().min(1).max(80) });

export type MolestiaResult = { ok: true; repeated: boolean; zones: Joint[] } | Fail<"no_valido" | "cerrada" | "fallo">;

// Parar el ejercicio hoy (guardarraíl 7; diseño D16, D23). Siempre deja la fila neutra "detenida" y
// suma al contador diario sin user_id. La marca de Molestia (dato de salud) solo con consentimiento
// vigente, escrita por el servidor (la tabla es de solo lectura para el usuario).
export async function marcarMolestia(input: unknown): Promise<MolestiaResult> {
  const parsed = molestiaSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "no_valido" };
  const { supabase, userId } = await claims();
  if (!userId) return { ok: false, error: "sin_sesion" };
  const v = parsed.data;

  const scope = await loadSessionScope(supabase, userId, v.sessionId);
  if (!scope || !scope.allowed.has(v.exerciseId)) return { ok: false, error: "no_valido" };
  if (!scope.session.open) return { ok: false, error: "cerrada" };

  const { data: own } = await supabase
    .from("set_logs")
    .select("set_index, status")
    .eq("session_id", v.sessionId)
    .eq("user_id", userId)
    .eq("exercise_id", v.exerciseId);
  if (!(own ?? []).some((s) => s.status === "detenida")) {
    const { error } = await supabase.from("set_logs").insert({
      id: crypto.randomUUID(),
      user_id: userId,
      session_id: v.sessionId,
      exercise_id: v.exerciseId,
      // Índice fijo fuera del rango de series (1–20): nunca choca con una serie real.
      set_index: DETENIDA_INDEX,
      weight_kg: 0,
      reps: 0,
      rir: null,
      status: "detenida",
    });
    if (error && error.code !== "23505") {
      logError("parar_ejercicio", error);
      return { ok: false, error: "fallo" };
    }
    const admin = createAdminClient();
    const counted = await admin.rpc("bump_daily_counter", { p_metric: "molestia" });
    if (counted.error) logError("contador_diario", counted.error);
  }

  // Sin consentimiento vigente no se guarda ni se consulta nada de salud.
  if (!(await hasActiveConsent(supabase, userId))) return { ok: true, repeated: false, zones: [] };

  const admin = createAdminClient();
  const mark = await admin
    .from("discomfort_marks")
    .upsert({ user_id: userId, exercise_id: v.exerciseId, session_id: v.sessionId }, { onConflict: "session_id,exercise_id", ignoreDuplicates: true });
  if (mark.error) logError("marca_salud", mark.error);

  // Molestia repetida: la sesión anterior (cerrada) en la que se hizo este ejercicio tuvo Molestia.
  const [{ data: previous }, { data: marks }] = await Promise.all([
    supabase
      .from("set_logs")
      .select("session_id, workout_sessions!inner(started_at, ended_at)")
      .eq("user_id", userId)
      .eq("exercise_id", v.exerciseId)
      .neq("session_id", v.sessionId)
      .not("workout_sessions.ended_at", "is", null)
      .order("created_at", { ascending: false })
      .limit(1),
    supabase.from("discomfort_marks").select("session_id").eq("user_id", userId).eq("exercise_id", v.exerciseId),
  ]);
  const repeated = isRepeatedDiscomfort(previous?.[0]?.session_id ?? null, new Set((marks ?? []).map((m) => m.session_id)));
  const exercise = scope.catalog.find((e) => e.id === v.exerciseId);
  const zones = repeated && exercise ? exercise.joints.filter((j) => !scope.limitations.includes(j)) : [];
  return { ok: true, repeated, zones };
}

const limitacionSchema = z.object({
  sessionId: uuid,
  exerciseId: z.string().min(1).max(80),
  zones: z.array(z.enum(JOINTS)).min(1).max(JOINTS.length),
});

export type LimitacionResult = { ok: true; changed: number; holes: number } | Fail<"no_valido" | "sin_consentimiento" | "fallo">;

// "Añadir y ajustar mi plan" (diseño D16): une las zonas a las limitaciones y refiltra gratis (D35).
// No toca el cribado. Solo zonas que carga ese ejercicio según el catálogo.
export async function anadirLimitacion(input: unknown): Promise<LimitacionResult> {
  const parsed = limitacionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "no_valido" };
  const { supabase, userId } = await claims();
  if (!userId) return { ok: false, error: "sin_sesion" };
  const v = parsed.data;
  if (!(await hasActiveConsent(supabase, userId))) return { ok: false, error: "sin_consentimiento" };

  const scope = await loadSessionScope(supabase, userId, v.sessionId);
  const exercise = scope?.catalog.find((e) => e.id === v.exerciseId);
  if (!scope || !exercise || !scope.allowed.has(v.exerciseId) || !v.zones.every((z) => exercise.joints.includes(z))) {
    return { ok: false, error: "no_valido" };
  }
  const limitations = [...new Set([...scope.limitations, ...v.zones])];
  const { error } = await createAdminClient().from("health_profile").update({ limitations }).eq("user_id", userId);
  if (error) {
    logError("anadir_limitacion", error);
    return { ok: false, error: "fallo" };
  }
  const refiltered = await refilterForUser(supabase, userId);
  if (!refiltered.ok) return { ok: false, error: "fallo" };
  return { ok: true, changed: refiltered.changed, holes: refiltered.holes };
}

// --- Terminar --------------------------------------------------------------------------------

const terminarSchema = z.object({ sessionId: uuid });

// Cierra la sesión (idempotente) y actualiza la carga de trabajo de los ejercicios ya calibrados
// antes de hoy. Con Molestia o "detenida", la carga no cambia (guardarraíl 7).
export async function terminarSesion(input: unknown): Promise<Fail<"no_valido" | "fallo">> {
  const parsed = terminarSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "no_valido" };
  const { supabase, userId } = await claims();
  if (!userId) return { ok: false, error: "sin_sesion" };
  const { sessionId } = parsed.data;

  const scope = await loadSessionScope(supabase, userId, sessionId);
  if (!scope) return { ok: false, error: "no_valido" };
  if (scope.session.open) {
    const [{ data: sets }, { data: states }, { data: marks }] = await Promise.all([
      supabase.from("set_logs").select("exercise_id, set_index, weight_kg, status").eq("session_id", sessionId).eq("user_id", userId),
      supabase.from("exercise_state").select("exercise_id, working_weight_kg, calibrated_at").eq("user_id", userId),
      supabase.from("discomfort_marks").select("exercise_id").eq("session_id", sessionId).eq("user_id", userId),
    ]);
    // Una sesión sin ninguna serie no cuenta como hecha: se borra y no hace avanzar el día del plan.
    if ((sets ?? []).length === 0) {
      const { error } = await createAdminClient().from("workout_sessions").delete().eq("id", sessionId).eq("user_id", userId).is("ended_at", null);
      if (error) logError("borrar_sesion_vacia", error);
      redirect("/hoy");
    }
    const stopped = new Set((marks ?? []).map((m) => m.exercise_id));
    const started = new Date(scope.session.startedAt);
    for (const state of states ?? []) {
      if (!state.calibrated_at || new Date(state.calibrated_at) >= started) continue;
      const own: Pick<LoggedSet, "setIndex" | "weightKg" | "status">[] = (sets ?? [])
        .filter((s) => s.exercise_id === state.exercise_id)
        .map((s) => ({ setIndex: s.set_index, weightKg: Number(s.weight_kg), status: s.status as LoggedSet["status"] }));
      if (own.length === 0) continue;
      const current = state.working_weight_kg === null ? null : Number(state.working_weight_kg);
      const next = workingWeightAfter(current, own, stopped.has(state.exercise_id));
      if (next !== current) {
        // La carga la escribe solo el servidor (revisión de código: el usuario ya no puede escribir exercise_state).
        const { error } = await createAdminClient()
          .from("exercise_state")
          .update({ working_weight_kg: next })
          .eq("user_id", userId)
          .eq("exercise_id", state.exercise_id);
        if (error) logError("carga_trabajo", error);
      }
    }
    const { error } = await supabase
      .from("workout_sessions")
      .update({ ended_at: new Date().toISOString() })
      .eq("id", sessionId)
      .eq("user_id", userId)
      .is("ended_at", null);
    if (error) {
      logError("terminar_sesion", error);
      return { ok: false, error: "fallo" };
    }
  }
  redirect(`/sesion/${sessionId}/fin`);
}
