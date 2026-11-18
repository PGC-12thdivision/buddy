// Tests de RLS contra STAGING (plan.md, U2 y KTD12). No hay Docker, así que no hay Supabase local.
// Solo corren con `npm run test:rls` (o RUN_RLS_TESTS=1) y las claves de staging en .env.local; nunca con prod.
// Crean dos usuarios con la API admin (sin email de confirmación) y los borran al terminar.
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const STAGING_REF = "jrzicjoyraqhwioeinwa";

function loadEnvLocal(): Record<string, string> {
  try {
    return Object.fromEntries(
      readFileSync(".env.local", "utf8")
        .split(/\r?\n/)
        .filter((line) => /^[A-Z_]+=/.test(line))
        .map((line) => [line.slice(0, line.indexOf("=")), line.slice(line.indexOf("=") + 1).trim()]),
    );
  } catch {
    return {};
  }
}

const env = { ...loadEnvLocal(), ...process.env } as Record<string, string | undefined>;
const url = env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const publishable = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
const secret = env.SUPABASE_SECRET_KEY ?? "";
const requested = env.RUN_RLS_TESTS === "1";
const enabled = requested && url.includes(STAGING_REF) && secret.startsWith("sb_secret_");

// Pedida pero sin claves de staging: falla en voz alta en vez de saltarse en silencio.
describe.runIf(requested && !enabled)("RLS en staging (configuración)", () => {
  it("necesita NEXT_PUBLIC_SUPABASE_URL de staging y SUPABASE_SECRET_KEY en .env.local", () => {
    throw new Error("La suite de RLS se pidió sin las claves de staging; nunca se ejecuta contra prod.");
  });
});

// Falla si la operación de preparación devolvió error: así la suite no pasa sin haber sembrado nada.
function must<T extends { error: { code?: string } | null }>(result: T, label: string): T {
  if (result.error) throw new Error(`${label}: ${result.error.code ?? "error"}`);
  return result;
}

describe.skipIf(!enabled)("RLS en staging", () => {
  // Se crea al usarse: con la suite desactivada no hay clave y createClient fallaría al cargar el archivo.
  const admin = enabled
    ? createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } })
    : (undefined as unknown as SupabaseClient);
  const password = `Pw-${randomUUID()}`;
  let userA = "";
  let userB = "";
  let clientA: SupabaseClient;
  let clientB: SupabaseClient;
  let sessionB = "";
  let exerciseId = "";

  async function signedInClient(email: string) {
    const client = createClient(url, publishable, { auth: { persistSession: false, autoRefreshToken: false } });
    const { error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw new Error(`login de prueba fallido: ${error.code}`);
    return client;
  }

  beforeAll(async () => {
    const stamp = Date.now();
    const emailA = `rls-a-${stamp}@buddy.test`;
    const emailB = `rls-b-${stamp}@buddy.test`;
    const a = await admin.auth.admin.createUser({ email: emailA, password, email_confirm: true });
    const b = await admin.auth.admin.createUser({ email: emailB, password, email_confirm: true });
    if (!a.data.user || !b.data.user) throw new Error("no se pudieron crear los usuarios de prueba");
    userA = a.data.user.id;
    userB = b.data.user.id;
    clientA = await signedInClient(emailA);
    clientB = await signedInClient(emailB);

    sessionB = randomUUID();
    const { error } = await clientB.from("workout_sessions").insert({ id: sessionB, kind: "normal" });
    if (error) throw new Error(`sesión de B: ${error.code}`);
    const exercise = must(await admin.from("exercises").select("id").limit(1).single(), "catálogo vacío");
    exerciseId = exercise.data!.id;
    must(
      await clientB.from("set_logs").insert({
        id: randomUUID(), session_id: sessionB, exercise_id: exerciseId,
        set_index: 1, weight_kg: 40, reps: 10, status: "hecha",
      }),
      "serie de B",
    );
    must(
      await admin.from("health_profile").insert({
        user_id: userB, limitations: ["rodilla"], screening_version: "test", screening_passed_at: new Date().toISOString(),
      }),
      "salud de B",
    );
    must(await admin.from("checkins").insert({ user_id: userB, week_start: "2026-11-16", feeling: 3, fatigue: 3 }), "check-in de B");
    must(await admin.from("discomfort_marks").insert({ user_id: userB, exercise_id: exerciseId, session_id: sessionB }), "molestia de B");
  }, 60_000);

  afterAll(async () => {
    if (userA) await admin.auth.admin.deleteUser(userA);
    if (userB) await admin.auth.admin.deleteUser(userB);
  }, 60_000);

  it("A no lee las series, el perfil de salud, las molestias ni los check-ins de B (y B sí los suyos)", async () => {
    for (const table of ["set_logs", "health_profile", "checkins", "workout_sessions", "discomfort_marks"]) {
      // Control positivo: la fila existe y su dueño la ve; si no, la prueba no demostraría nada.
      const own = await clientB.from(table).select("*").eq("user_id", userB);
      expect(own.error, table).toBeNull();
      expect((own.data ?? []).length, table).toBeGreaterThan(0);
      const other = await clientA.from(table).select("*").eq("user_id", userB);
      expect(other.error, table).toBeNull();
      expect(other.data, table).toHaveLength(0);
    }
  });

  it("A da su consentimiento y solo puede retirarlo: ni reescribirlo ni volver a darlo por la misma fila", async () => {
    const given = must(await clientA.from("consents").insert({ version: "test" }).select("id").single(), "consentimiento de A");
    const id = given.data!.id as string;
    await clientA.from("consents").update({ version: "otra" }).eq("id", id);
    const withdrawn = await clientA.from("consents").update({ withdrawn_at: new Date().toISOString() }).eq("id", id).select("id");
    expect(withdrawn.error).toBeNull();
    expect(withdrawn.data).toHaveLength(1);
    await clientA.from("consents").update({ withdrawn_at: null }).eq("id", id);
    const { data } = await admin.from("consents").select("version, withdrawn_at").eq("id", id).single();
    expect(data!.version).toBe("test");
    expect(data!.withdrawn_at).not.toBeNull();
  });

  it("A no puede tocar el consentimiento de B", async () => {
    const givenB = must(await clientB.from("consents").insert({ version: "test" }).select("id").single(), "consentimiento de B");
    await clientA.from("consents").update({ withdrawn_at: new Date().toISOString() }).eq("id", givenB.data!.id);
    const { data } = await admin.from("consents").select("withdrawn_at").eq("id", givenB.data!.id).single();
    expect(data!.withdrawn_at).toBeNull();
  });

  it("A no puede cambiar su rol ni su suscripción", async () => {
    await clientA.from("account_status").update({ role: "admin", subscription_status: "active" }).eq("user_id", userA);
    const { data } = await admin.from("account_status").select("role, subscription_status").eq("user_id", userA).single();
    expect(data).toEqual({ role: "user", subscription_status: "none" });
  });

  it("al registrarse se crea el estado de cuenta con 14 días de prueba", async () => {
    const { data } = await clientA.from("account_status").select("trial_ends_at").single();
    const days = (new Date(data!.trial_ends_at).getTime() - Date.now()) / 86_400_000;
    expect(days).toBeGreaterThan(13.9);
    expect(days).toBeLessThanOrEqual(14);
  });

  it("A no puede escribir health_profile, ni marcar el cribado, ni guardar limitaciones", async () => {
    const { error } = await clientA.from("health_profile").insert({
      user_id: userA, limitations: [], screening_version: "x", screening_passed_at: new Date().toISOString(),
    });
    expect(error).not.toBeNull();
  });

  it("A no puede insertar en checkins, ai_calls, events, stripe_events, email_log ni discomfort_marks", async () => {
    const attempts = await Promise.all([
      clientA.from("checkins").insert({ user_id: userA, week_start: "2026-11-16", feeling: 3, fatigue: 3 }),
      clientA.from("ai_calls").insert({ user_id: userA, kind: "plan", model: "x" }),
      clientA.from("events").insert({ user_id: userA, name: "registro" }),
      clientA.from("stripe_events").insert({ event_id: `evt_${randomUUID()}` }),
      clientA.from("email_log").insert({ user_id: userA, kind: "bienvenida", period: "x", status: "sent" }),
      clientA.from("discomfort_marks").insert({ user_id: userA, exercise_id: exerciseId, session_id: sessionB }),
    ]);
    for (const { error } of attempts) expect(error).not.toBeNull();
  });

  it("ni A ni un anónimo pueden ejecutar el contador diario (función SECURITY DEFINER)", async () => {
    const { error } = await clientA.rpc("bump_daily_counter", { p_metric: "molestia" });
    expect(error).not.toBeNull();
    const anon = createClient(url, publishable, { auth: { persistSession: false } });
    const anonymous = await anon.rpc("bump_daily_counter", { p_metric: "molestia" });
    expect(anonymous.error).not.toBeNull();
  });

  it("insertar dos veces la misma serie deja una sola fila", async () => {
    const session = randomUUID();
    must(await clientA.from("workout_sessions").insert({ id: session, kind: "normal" }), "sesión de A");
    const set = {
      id: randomUUID(), session_id: session, exercise_id: exerciseId,
      set_index: 1, weight_kg: 40, reps: 10, status: "hecha",
    };
    await clientA.from("set_logs").upsert(set, { onConflict: "id", ignoreDuplicates: true });
    await clientA.from("set_logs").upsert(set, { onConflict: "id", ignoreDuplicates: true });
    const { count } = await admin.from("set_logs").select("*", { count: "exact", head: true }).eq("id", set.id);
    expect(count).toBe(1);
  });

  it("A no puede colgar una serie de la sesión de B, ni editar o borrar series de B", async () => {
    const { error } = await clientA.from("set_logs").insert({
      id: randomUUID(), session_id: sessionB, exercise_id: exerciseId,
      set_index: 1, weight_kg: 40, reps: 10, status: "hecha",
    });
    expect(error).not.toBeNull();
    await clientA.from("set_logs").update({ reps: 99 }).eq("user_id", userB);
    await clientA.from("set_logs").delete().eq("user_id", userB);
    const { data } = await admin.from("set_logs").select("reps").eq("user_id", userB);
    expect(data!.length).toBeGreaterThan(0);
    expect(data!.every((row) => row.reps === 10)).toBe(true);
  });

  it("un usuario con sesión lee el catálogo y un anónimo no", async () => {
    const withSession = await clientA.from("exercises").select("id").limit(1);
    expect(withSession.error).toBeNull();
    expect(withSession.data!.length).toBe(1);
    const anon = createClient(url, publishable, { auth: { persistSession: false } });
    const anonymous = await anon.from("exercises").select("id").limit(1);
    expect(anonymous.error !== null || (anonymous.data ?? []).length === 0).toBe(true);
  });

  it("dos reservas simultáneas del plan inicial: solo una pasa (KTD18)", async () => {
    const args = { p_user: userB, p_kind: "plan", p_model: "test", p_period_limit: 1, p_max_duration_s: 120 };
    const results = await Promise.all([admin.rpc("reserve_ai_call", args), admin.rpc("reserve_ai_call", args)]);
    for (const r of results) expect(r.error).toBeNull();
    const oks = results.filter((r) => (r.data as { ok: boolean }).ok);
    expect(oks).toHaveLength(1);
    expect(results.map((r) => (r.data as { reason?: string }).reason)).toContain("limite_alcanzado");
  });

  it("A no puede reservar llamadas de IA ni guardar planes (solo el servidor)", async () => {
    const reserve = await clientA.rpc("reserve_ai_call", {
      p_user: userA, p_kind: "plan", p_model: "x", p_period_limit: 99, p_max_duration_s: 1,
    });
    expect(reserve.error).not.toBeNull();
    const save = await clientA.rpc("save_plan", {
      p_user: userA, p_plan: {}, p_ai_call: null, p_input_tokens: 0, p_output_tokens: 0, p_cost_usd: 0,
    });
    expect(save.error).not.toBeNull();
  });

  it("borrar la cuenta deja cero filas del usuario", async () => {
    const stamp = Date.now();
    const created = await admin.auth.admin.createUser({ email: `rls-c-${stamp}@buddy.test`, password, email_confirm: true });
    const userC = created.data.user!.id;
    await admin.from("events").insert({ user_id: userC, name: "registro" });
    await admin.auth.admin.deleteUser(userC);
    for (const table of ["account_status", "user_settings", "events"]) {
      const { count } = await admin.from(table).select("*", { count: "exact", head: true }).eq("user_id", userC);
      expect(count).toBe(0);
    }
  });
});
