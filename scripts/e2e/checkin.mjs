// Check-in del coach de punta a punta en staging (U8). Uso: node scripts/e2e/checkin.mjs [baseUrl]
// - Crea un usuario confirmado con respuestas, equipo completo, consentimiento y limitación de rodilla
//   (como si hubiera pasado el wizard), genera su plan con IA real y le apunta 3 sesiones hechas esta
//   semana, una con Molestia en un ejercicio del plan.
// - En el navegador: fila de Hoy, escalas, ajuste con IA real, segundo check-in sin IA y "Aplicar".
// - Comprueba en la base de datos: checkins, ai_calls (tipo checkin) y la versión nueva del plan sin
//   el ejercicio con Molestia ni ejercicios que carguen la rodilla. Capturas a 360 px.
// Lee las claves de .env.local y nunca las imprime. Solo para staging: se niega a correr contra prod.
import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const STAGING_REF = "jrzicjoyraqhwioeinwa";
const env = Object.fromEntries(
  fs
    .readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).replace(/^"|"$/g, "")]),
);
if (!env.NEXT_PUBLIC_SUPABASE_URL.includes(STAGING_REF)) throw new Error("Solo contra staging");

const corePath =
  process.env.PLAYWRIGHT_CORE ??
  path.join(process.env.APPDATA, "npm/node_modules/@playwright/cli/node_modules/playwright-core/index.mjs");
const { chromium } = await import(pathToFileURL(corePath).href);

const base = process.argv[2] ?? "http://localhost:3000";
const outDir = path.join(process.env.E2E_OUT ?? "e2e-out", "checkin");
fs.mkdirSync(outDir, { recursive: true });
const report = { steps: [], findings: [] };
const step = (name, ok, extra = {}) => report.steps.push({ name, ok, ...extra });
const check = (ok, text) => {
  if (!ok) report.findings.push(text);
};

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
const email = `e2e-checkin-${Date.now()}@buddy.test`;
const password = `Prueba-${Math.random().toString(36).slice(2)}-X9`;
const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
if (!created.data.user) throw new Error(`no se pudo crear el usuario: ${created.error?.code}`);
const userId = created.data.user.id;
const must = (res, what) => {
  if (res.error) throw new Error(`${what}: ${res.error.code}`);
  return res.data;
};
must(await admin.from("onboarding_answers").insert({ user_id: userId, focus: "equilibrado", experience: "6_meses_2_anos", days_per_week: 3, minutes_per_session: 45, sports: ["padel"] }), "respuestas");
const equipment = must(await admin.from("equipment_types").select("id"), "equipo").map((e) => e.id);
must(await admin.from("gym_profiles").insert({ user_id: userId, preset: "completo", equipment_type_ids: equipment }), "gimnasio");
must(await admin.from("consents").insert({ user_id: userId, version: "salud-2026-11-v1" }), "consentimiento");
must(
  await admin.from("health_profile").insert({ user_id: userId, limitations: ["rodilla"], screening_version: "cribado-2026-11-v1", screening_passed_at: new Date().toISOString() }),
  "salud",
);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 360, height: 640 } });
const snap = (name) => page.screenshot({ path: path.join(outDir, `${name}.png`), fullPage: true });
const api = (url, body) =>
  page.evaluate(
    async ([u, b]) => {
      const r = await fetch(u, { method: "POST", headers: { "Content-Type": "application/json" }, body: b === null ? undefined : JSON.stringify(b) });
      return { http: r.status, ...(await r.json()) };
    },
    [url, body],
  );
const knee = new Set(must(await admin.from("exercises").select("id, joints"), "catálogo").filter((e) => e.joints.includes("rodilla")).map((e) => e.id));
const activeSlots = async () => {
  const plan = must(await admin.from("plans").select("id, version, source").eq("user_id", userId).eq("is_active", true).single(), "plan activo");
  const sessions = must(await admin.from("plan_sessions").select("id").eq("plan_id", plan.id), "sesiones");
  const slots = must(await admin.from("plan_slots").select("exercise_id, sets").in("plan_session_id", sessions.map((s) => s.id)), "huecos");
  return { plan, ids: slots.map((s) => s.exercise_id).filter(Boolean) };
};
const checkinCalls = async () => must(await admin.from("ai_calls").select("outcome, input_tokens, output_tokens, cost_usd").eq("user_id", userId).eq("kind", "checkin"), "ai_calls");

try {
  await page.goto(`${base}/entrar`);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Contraseña").fill(password);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/entrar"), { timeout: 30000 });
  step("entrar", true);

  const plan = await api("/api/plan", null);
  if (plan.status !== "ok") throw new Error(`plan: ${plan.status}`);
  const first = await activeSlots();
  step("plan", true, { version: first.plan.version, ejercicios: first.ids.length });

  // 3 sesiones hechas esta semana; Molestia en el primer ejercicio del plan en la primera.
  const now = new Date().toISOString();
  const sessionIds = [crypto.randomUUID(), crypto.randomUUID(), crypto.randomUUID()];
  must(await admin.from("workout_sessions").insert(sessionIds.map((id) => ({ id, user_id: userId, kind: "normal", started_at: now, ended_at: now }))), "sesiones hechas");
  const sore = first.ids[0];
  must(await admin.from("discomfort_marks").insert({ user_id: userId, exercise_id: sore, session_id: sessionIds[0] }), "molestia");

  await page.goto(`${base}/hoy`);
  await page.getByRole("link", { name: "Check-in de la semana" }).waitFor({ timeout: 20000 });
  await snap("1-hoy-fila");
  step("fila_hoy", true);

  await page.getByRole("link", { name: "Check-in de la semana" }).click();
  await page.getByRole("radiogroup", { name: /Cómo te has sentido/ }).waitFor({ timeout: 20000 });
  await page.getByRole("radiogroup", { name: /Cómo te has sentido/ }).getByRole("radio", { name: "2", exact: true }).click();
  await page.getByRole("radiogroup", { name: /Fatiga/ }).getByRole("radio", { name: "4", exact: true }).click();
  await snap("2-escalas");
  const started = Date.now();
  await page.getByRole("button", { name: "Ver mi ajuste" }).click();
  await page.getByText("Pensando…").waitFor({ timeout: 5000 }).then(() => snap("3-pensando")).catch(() => {});
  await page.getByRole("heading", { name: "Lo que hicieron las reglas" }).waitFor({ timeout: 120000 });
  await snap("4-ajuste");
  step("ajuste", true, { segundos: Math.round((Date.now() - started) / 1000) });

  const [row] = must(await admin.from("checkins").select("feeling, fatigue, applied, adjustment").eq("user_id", userId), "checkins");
  check(row && row.feeling === 2 && row.fatigue === 4 && row.applied === null, "fila de checkins incorrecta");
  const proposed = (row?.adjustment?.plan ?? []).flatMap((s) => s.slots.map((x) => x.exerciseId)).filter(Boolean);
  check(!proposed.includes(sore), "el ajuste mantiene el ejercicio con Molestia");
  check(!proposed.some((id) => knee.has(id)), "el ajuste tiene un ejercicio que carga la rodilla");
  const calls = await checkinCalls();
  check(calls.length === 1 && calls[0].outcome === "ok" && calls[0].input_tokens > 0, "ai_calls no registra el check-in como ok");
  report.ajuste = { titulo: row?.adjustment?.titulo, cambios: row?.adjustment?.cambios?.length, descartados: row?.adjustment?.descartados, llamada: calls[0] };

  // Segundo check-in de la semana: el guardado, sin IA.
  const again = await api("/api/checkin", { sensacion: 5, fatiga: 1 });
  check(again.status === "ok", `segundo check-in: ${again.status}`);
  check((await checkinCalls()).length === 1, "el segundo check-in llamó a la IA");
  step("segundo_sin_ia", true);

  await page.getByRole("button", { name: "Aplicar a mi semana" }).click();
  await page.getByText("Aplicado: tu plan ya tiene la versión nueva.").waitFor({ timeout: 30000 });
  await snap("5-aplicado");
  const after = await activeSlots();
  check(after.plan.version === first.plan.version + 1 && after.plan.source === "checkin", "Aplicar no creó la versión nueva del plan");
  check(!after.ids.includes(sore), "el plan aplicado mantiene el ejercicio con Molestia");
  check(!after.ids.some((id) => knee.has(id)), "el plan aplicado carga la rodilla");
  step("aplicar", true, { version: after.plan.version });

  await page.goto(`${base}/hoy`);
  await page.getByRole("link", { name: "Check-in hecho. Ver tu ajuste" }).waitFor({ timeout: 20000 });
  await snap("6-hoy-hecho");
  step("fila_hecho", true);
} catch (error) {
  step("error", false, { error: String(error).slice(0, 300), url: page.url() });
  report.findings.push(`Se paró en ${page.url().replace(base, "")}: ${String(error).slice(0, 200)}`);
  await snap("parada").catch(() => {});
} finally {
  await browser.close();
  fs.writeFileSync(path.join(outDir, "informe.json"), JSON.stringify(report, null, 2));
  if (!process.env.E2E_KEEP) await admin.auth.admin.deleteUser(userId);
  console.log(JSON.stringify({ ok: report.findings.length === 0, ...report }, null, 1));
}
