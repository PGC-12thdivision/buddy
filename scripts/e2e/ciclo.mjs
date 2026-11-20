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

// Plan activo con las articulaciones y el equipo de cada ejercicio.
async function activePlan() {
  const { data: plan } = await admin.from("plans").select("id, version, focus, source").eq("user_id", userId).eq("is_active", true).single();
  const { data: ps } = await admin.from("plan_sessions").select("id").eq("plan_id", plan.id);
  const { data: slots } = await admin
    .from("plan_slots")
    .select("exercise_id, exercise:exercises(joints, equipment_type_id)")
    .in("plan_session_id", ps.map((s) => s.id));
  return { ...plan, slots: slots.filter((s) => s.exercise_id) };
}

// Flujos de Ajustes (U11), cada uno con su comprobación en base de datos.
async function ajustes() {
  const sub = async (name, fn) => {
    try {
      await fn();
      step(`ajustes_${name}`, true);
    } catch (error) {
      step(`ajustes_${name}`, false, { error: String(error).slice(0, 200) });
      finding("alta", `Ajustes, ${name}: ${String(error).slice(0, 160)}`);
      await snap(`ajustes-${name}-fallo`).catch(() => {});
    }
  };

  await sub("limitaciones", async () => {
    const before = await activePlan();
    await page.goto(`${base}/ajustes/limitaciones`);
    await click("button", "Hombro", { exact: true });
    await snap("ajustes-limitaciones");
    await click("button", "Guardar", { exact: true });
    await page.waitForTimeout(4000);
    await snap("ajustes-limitaciones-hecho");
    const { data: hp } = await admin.from("health_profile").select("limitations").eq("user_id", userId).single();
    if (!hp.limitations.includes("hombro")) throw new Error("no se guardó la limitación");
    const after = await activePlan();
    if (after.slots.some((s) => s.exercise.joints.includes("hombro"))) throw new Error("el plan sigue cargando el hombro");
    if (after.version === before.version && before.slots.some((s) => s.exercise.joints.includes("hombro"))) throw new Error("no se refiltró");
  });

  await sub("gimnasio", async () => {
    await page.goto(`${base}/ajustes/gimnasio`);
    await page.locator("summary", { hasText: "Pierna" }).first().click();
    const chip = page.getByRole("button", { name: /Prensa de piernas/ }).first();
    await chip.waitFor({ timeout: 10000 });
    const pressed = await chip.getAttribute("aria-pressed");
    if (pressed === "true") await chip.click();
    await snap("ajustes-gimnasio");
    await click("button", "Guardar", { exact: true });
    await page.waitForTimeout(4000);
    await snap("ajustes-gimnasio-hecho");
    const { data: gp } = await admin.from("gym_profiles").select("equipment_type_ids").eq("user_id", userId).single();
    if (gp.equipment_type_ids.includes("prensa_piernas")) throw new Error("no se guardó el equipo");
    const after = await activePlan();
    if (after.slots.some((s) => s.exercise.equipment_type_id === "prensa_piernas")) throw new Error("el plan sigue usando la prensa");
  });

  await sub("tema", async () => {
    await page.goto(`${base}/ajustes`);
    await page.getByRole("radio", { name: "Oscuro", exact: true }).click();
    await page.waitForTimeout(1500);
    await snap("ajustes-oscuro");
    const dark = await page.evaluate(() => document.documentElement.classList.contains("dark"));
    if (!dark) throw new Error("no se aplica la clase dark");
    await page.goto(`${base}/hoy`);
    await snap("hoy-oscuro");
    await page.goto(`${base}/ajustes`);
    await page.getByRole("radio", { name: "Claro", exact: true }).click();
  });

  await sub("foco_dias", async () => {
    const before = await activePlan();
    await page.goto(`${base}/ajustes/foco-dias`);
    const target = before.focus === "fuerza" ? /^Más músculo/ : /^Más fuerza/;
    await page.getByRole("radio", { name: target }).first().click();
    await snap("ajustes-foco");
    await page.locator(".wz-cta").last().click();
    await click("button", "Sí, crear plan nuevo");
    await page.waitForURL(/\/plan/, { timeout: 150000 });
    const after = await activePlan();
    if (after.version === before.version) throw new Error("no se creó un plan nuevo");
    await page.goto(`${base}/ajustes/foco-dias`);
    await page.waitForLoadState("networkidle");
    await snap("ajustes-foco-limite");
    // En la prueba premium caben 5 cambios al mes; gratis, 1 (D43).
    const notice = await page.getByText(/Ya has usado el cambio de este mes|Has usado los cambios de este mes|hasta 5 veces al mes/).count();
    if (!notice) finding("media", "Foco y días: no se explica el límite de cambios del mes");
  });

  await sub("retirar_consentimiento", async () => {
    await page.goto(`${base}/ajustes`);
    await click("button", "Retirar el consentimiento", { exact: true });
    await snap("ajustes-retirar");
    await click("button", "Sí, retirar el consentimiento", { exact: true });
    await page.waitForURL(/consentimiento/, { timeout: 20000 });
    const { data: hp } = await admin.from("health_profile").select("user_id").eq("user_id", userId);
    const { data: dm } = await admin.from("discomfort_marks").select("id").eq("user_id", userId);
    if (hp.length || dm.length) throw new Error("quedan datos de salud");
  });
}

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
    const s = { n, sets: 0, rir: 0, steps: 0, molestia: 0, saltos: 0, pruebas: 0, tecnica: 0, editar: 0 };
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
      // Calibración en dos tiempos: la serie de prueba ("Serie hecha") y luego la respuesta.
      const calibrando = (await page.locator("main[aria-label^=\"Calibración\"]").count()) > 0;
      if (calibrando && (await page.getByRole("button", { name: "Serie hecha" }).count()) > 0) {
        if (s.pruebas === 0) await snap(`s${n}-calibracion-serie`);
        if (s.pruebas === 1) await snap(`s${n}-calibracion-serie-2`);
        await click("button", "Serie hecha");
        s.pruebas++;
        continue;
      }
      if ((await page.getByRole("button", { name: "Serie hecha" }).count()) > 0) {
        // Regla de alto (D22): en 360×640, peso, repeticiones, +/− y "Serie hecha" sin scroll.
        if (s.sets === 0 && s.tecnica === 0) {
          await page.evaluate(() => window.scrollTo(0, 0));
          const fold = await page.evaluate(() => {
            const bottom = (sel) => document.querySelector(sel)?.getBoundingClientRect().bottom ?? 0;
            const cta = [...document.querySelectorAll("button")].find((b) => b.textContent?.trim() === "Serie hecha")?.getBoundingClientRect();
            // Borde superior del pie fijo (aviso o botonera, según el momento: el aviso sustituye a la botonera).
            const foot = [...document.querySelectorAll(".wz-foot .ss-toast, .wz-foot .ss-dock")].map((e) => e.getBoundingClientRect().top);
            const dock = foot.length ? Math.min(...foot) : window.innerHeight;
            return { pm: bottom(".ss-pm"), dockTop: dock, ctaBottom: cta?.bottom ?? 0, h: window.innerHeight };
          });
          if (fold.pm > fold.dockTop || fold.ctaBottom > fold.h) finding("media", `Sesión ${n}: +/− o "Serie hecha" fuera de la pantalla (${JSON.stringify(fold)})`);
          await snap(`s${n}-serie`);
        }
        // Técnica a mano en la serie: se abre una vez, se captura y se cierra con Esc.
        if (s.tecnica === 0 && (await page.getByRole("button", { name: /Cómo se hace/ }).count()) > 0) {
          await click("button", /Cómo se hace/);
          await page.getByRole("dialog").waitFor({ timeout: 5000 });
          await snap(`s${n}-tecnica`);
          await page.keyboard.press("Escape");
          s.tecnica++;
          continue;
        }
        // Corregir una serie hecha (D8): se abre la hoja, se captura y se guarda una corrección.
        const hecha = page.getByRole("button", { name: /hecha. Tocar para corregirla/ });
        if (s.editar === 0 && (await hecha.count()) > 0) {
          await page.evaluate(() => window.scrollTo(0, 0));
          await snap(`s${n}-serie-con-lista`);
          await hecha.first().click();
          await page.getByRole("dialog").waitFor({ timeout: 5000 });
          await snap(`s${n}-editar-serie`);
          // Corrige una repetición menos y guarda: el aviso confirma que el servidor la aceptó.
          const dialog = page.getByRole("dialog");
          await dialog.getByRole("button", { name: /^Menos repeticiones/ }).click();
          await dialog.getByRole("button", { name: "Guardar", exact: true }).click();
          const fixed = await page.getByText(/^Serie 1 corregida.$/).waitFor({ timeout: 10000 }).then(() => true).catch(() => false);
          if (!fixed) finding("media", `Sesión ${n}: no se pudo corregir la serie 1`);
          s.editar++;
          continue;
        }
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

  if (persona.ajustes) await ajustes();
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
