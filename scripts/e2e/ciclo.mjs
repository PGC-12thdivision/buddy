// Ciclo completo de un usuario en staging (banco de pruebas, 18/11/2026).
// Uso: node scripts/e2e/ciclo.mjs <perfil.json> [baseUrl]
// - Crea un usuario confirmado en Supabase de staging con sus respuestas del wizard (como el registro).
// - Recorre la app con el navegador: consentimiento, limitaciones, cribado, plan con IA real, sesión de
//   calibración, sesión normal, Plan, Progreso y Ajustes. Capturas a 360 px e informe JSON.
// Lee las claves de .env.local y nunca las imprime. Solo para staging: se niega a correr contra prod.
import { createClient } from "@supabase/supabase-js";
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

const persona = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const base = process.argv[3] ?? "http://localhost:3000";
const outDir = path.join(process.env.E2E_OUT ?? "e2e-out", persona.id);
fs.mkdirSync(outDir, { recursive: true });

const report = { persona: persona.id, steps: [], findings: [], plan: null, sessions: [], consoleErrors: [] };
const step = (name, ok, extra = {}) => report.steps.push({ name, ok, ...extra });
const finding = (severity, text) => report.findings.push({ severity, text });

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
const email = `e2e-${persona.id}-${Date.now()}@buddy.test`;
const password = `Prueba-${Math.random().toString(36).slice(2)}-X9`;

const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
if (!created.data.user) throw new Error(`no se pudo crear el usuario: ${created.error?.code}`);
const userId = created.data.user.id;
report.userId = userId;
await admin.from("onboarding_answers").insert({
  user_id: userId,
  focus: persona.focus,
  experience: persona.experience ?? "6_meses_2_anos",
  days_per_week: persona.days,
  minutes_per_session: persona.minutes ?? 45,
  sports: persona.sports ?? [],
});
let equipment = persona.equipment;
if (!equipment || equipment === "todo") {
  const { data } = await admin.from("equipment_types").select("id");
  equipment = data.map((e) => e.id);
}
await admin.from("gym_profiles").insert({ user_id: userId, preset: persona.preset ?? "completo", equipment_type_ids: equipment });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: persona.width ?? 360, height: 640 } });
page.on("console", (m) => m.type() === "error" && report.consoleErrors.push(m.text().slice(0, 200)));
page.on("pageerror", (e) => report.consoleErrors.push(`pageerror: ${String(e).slice(0, 200)}`));
let shot = 0;
const snap = async (name) => page.screenshot({ path: path.join(outDir, `${String(++shot).padStart(2, "0")}-${name}.png`) });
const click = async (role, name, opts = {}) => {
  const el = page.getByRole(role, { name, exact: opts.exact ?? false }).first();
  await el.waitFor({ state: "visible", timeout: opts.timeout ?? 15000 });
  await el.click();
};
const urlIs = (re, timeout = 20000) => page.waitForURL(re, { timeout });

try {
  // Entrar
  await page.goto(`${base}/entrar`);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Contraseña").fill(password);
  await click("button", "Entrar", { exact: true });
  await urlIs(/consentimiento/);
  step("entrar", true);

  // Consentimiento
  await page.getByRole("checkbox").check();
  await snap("consentimiento");
  await page.locator(".wz-cta").last().click();
  await urlIs(/limitaciones/);
  step("consentimiento", true);

  // Limitaciones
  const zones = persona.limitations ?? [];
  if (zones.length === 0) await click("button", "Ninguna");
  const LABELS = { hombro: "Hombro", codo: "Codo", muneca: "Muñeca", cuello_espalda_alta: "Cuello o espalda alta", espalda_baja: "Espalda baja", cadera: "Cadera", rodilla: "Rodilla", tobillo: "Tobillo" };
  for (const z of zones) await click("button", LABELS[z], { exact: true });
  await snap("limitaciones");
  await page.locator(".wz-cta").last().click();
  await urlIs(/seguridad/);
  step("limitaciones", true);

  // Cribado: todo "No" salvo la articular, que es "Sí" si hay limitaciones (PRD §13).
  const groups = page.getByRole("radiogroup");
  await groups.first().waitFor();
  const count = await groups.count();
  for (let i = 0; i < count; i++) {
    const g = groups.nth(i);
    const label = (await g.getAttribute("aria-label")) ?? "";
    const yes = zones.length > 0 && /huesos, articulaciones/.test(label);
    await g.getByRole("radio", { name: yes ? "Sí" : "No", exact: true }).click();
  }
  await snap("seguridad");
  await page.locator(".wz-cta").last().click();
  await urlIs(/resumen|plan|generando/, 30000);
  step("seguridad", true);

  // Resumen → generar
  if (page.url().includes("resumen")) {
    await snap("resumen");
    await click("link", "Generar mi plan");
  }
  const t0 = Date.now();
  await urlIs(/\/plan/, 150000).catch(async () => {
    await snap("generando-fallo");
    const title = await page.locator("h1").first().textContent();
    throw new Error(`generar plan: ${title}`);
  });
  step("generar_plan", true, { ms: Date.now() - t0 });
  await page.waitForLoadState("networkidle");
  await snap("plan");

  // Plan guardado: huecos y sesiones vacías (D68)
  const { data: plans } = await admin.from("plans").select("id, template, days_per_week").eq("user_id", userId).eq("is_active", true);
  const { data: ps } = await admin.from("plan_sessions").select("id, day_index, label").eq("plan_id", plans[0].id).order("day_index");
  const { data: slots } = await admin.from("plan_slots").select("plan_session_id, exercise_id, sets, gap_reason, exercise:exercises(joints)").in("plan_session_id", ps.map((s) => s.id));
  report.plan = ps.map((s) => {
    const own = slots.filter((x) => x.plan_session_id === s.id);
    return { day: s.day_index + 1, label: s.label, ejercicios: own.filter((x) => x.exercise_id).length, huecos: own.filter((x) => !x.exercise_id).length };
  });
  for (const d of report.plan) if (d.ejercicios === 0) finding("alta", `Día ${d.day} sin ejercicios`);
  for (const x of slots) {
    if (x.exercise_id && (x.exercise?.joints ?? []).some((j) => zones.includes(j))) finding("alta", `Ejercicio ${x.exercise_id} carga una zona limitada`);
  }

  // Sesiones: calibración y una normal
  for (let n = 1; n <= (persona.sessions ?? 2); n++) {
    await page.goto(`${base}/hoy`);
    await snap(`hoy-${n}`);
    await page.locator(".wz-cta").last().click();
    await urlIs(/\/sesion\//, 30000);
    const s = { n, sets: 0, rir: 0, steps: 0, molestia: 0, saltos: 0 };
    for (let guard = 0; guard < 120; guard++) {
      await page.waitForTimeout(400);
      if (/\/fin/.test(page.url())) break;
      if (/\/hoy/.test(page.url())) {
        finding("media", `Sesión ${n}: volvió a Hoy sin fin de sesión`);
        break;
      }
      // Con una hoja abierta (guardando), no se toca nada más.
      if ((await page.getByRole("dialog").count()) > 0 && (await page.getByRole("button", { name: "Ahora no" }).count()) === 0) continue;
      const ouch = persona.molestiaEnSesion === n && s.molestia === 0 && (await page.getByRole("button", { name: /^Tengo molestia/ }).count()) > 0;
      if (ouch) {
        await click("button", /^Tengo molestia/);
        await snap(`s${n}-molestia`);
        await click("button", "Parar este ejercicio");
        // Espera a que la hoja termine de guardar (o a la hoja de Molestia repetida).
        await page.waitForFunction(() => !document.querySelector("[role=dialog]") || /Ahora no/.test(document.body.innerText), null, { timeout: 15000 });
        s.molestia++;
        continue;
      }
      if (persona.saltarEnSesion === n && s.saltos === 0 && (await page.getByRole("button", { name: "Saltar hoy" }).count()) > 0) {
        await click("button", "Saltar hoy");
        s.saltos++;
        continue;
      }
      if ((await page.getByRole("button", { name: "Ahora no" }).count()) > 0) {
        await click("button", "Ahora no");
        continue;
      }
      if ((await page.getByRole("button", { name: "Empezar", exact: true }).count()) > 0) {
        if (s.steps === 0) await snap(`s${n}-paso`);
        await click("button", "Empezar", { exact: true });
        s.steps++;
        continue;
      }
      const rir = page.getByRole("group", { name: /Cuántas más/ });
      if ((await rir.count()) > 0) {
        if (s.rir === 0) await snap(`s${n}-calibracion`);
        await rir.getByRole("button", { name: s.rir % 3 === 0 ? "4 o más" : "2", exact: true }).click();
        s.rir++;
        await page.waitForTimeout(900);
        continue;
      }
      if ((await page.getByRole("button", { name: "Serie hecha" }).count()) > 0) {
        if (s.sets === 0) await snap(`s${n}-serie`);
        await click("button", "Serie hecha");
        s.sets++;
        continue;
      }
      // El anunciador de rutas de Next también es role="alert": se ignora.
      const alert = await page.locator("[role=alert]:not(#__next-route-announcer__)").first().textContent({ timeout: 500 }).catch(() => null);
      if (alert) {
        finding("alta", `Sesión ${n}: error en pantalla: ${alert.slice(0, 120)}`);
        await snap(`s${n}-error`);
        break;
      }
    }
    await page.waitForLoadState("networkidle");
    await snap(`fin-${n}`);
    const done = /\/fin/.test(page.url());
    if (!done) finding("alta", `Sesión ${n}: no llegó al fin de sesión`);
    report.sessions.push({ ...s, fin: done });
  }

  // Estado en base de datos tras las sesiones
  const { data: states } = await admin.from("exercise_state").select("exercise_id, working_weight_kg, calibrated_at").eq("user_id", userId);
  report.calibrados = (states ?? []).filter((x) => x.calibrated_at).length;
  const { data: ws } = await admin.from("workout_sessions").select("ended_at").eq("user_id", userId);
  report.sesionesCerradas = (ws ?? []).filter((x) => x.ended_at).length;
  if (report.sesionesCerradas < (persona.sessions ?? 2)) finding("alta", `Solo ${report.sesionesCerradas} sesiones cerradas`);

  for (const p of ["plan", "progreso", "ajustes"]) {
    await page.goto(`${base}/${p}`);
    await page.waitForLoadState("networkidle");
    await snap(`tab-${p}`);
    const notFound = await page.getByText("Esta página no existe").count();
    if (notFound) finding("alta", `/${p} da 404`);
  }
  step("ciclo", true);
} catch (error) {
  step("error", false, { error: String(error).slice(0, 300), url: page.url() });
  finding("alta", `Se paró en ${page.url().replace(base, "")}: ${String(error).slice(0, 200)}`);
  await snap("parada").catch(() => {});
} finally {
  await browser.close();
  fs.writeFileSync(path.join(outDir, "informe.json"), JSON.stringify(report, null, 2));
  if (!process.env.E2E_KEEP) await admin.auth.admin.deleteUser(userId);
  console.log(JSON.stringify({ persona: persona.id, ok: report.findings.length === 0, findings: report.findings, plan: report.plan, sessions: report.sessions }));
}
