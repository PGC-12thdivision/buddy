// Persistencia y progresión entre días en staging (QA del 20/11/2026). Uso: node scripts/e2e/memoria.mjs [baseUrl]
// - Crea un usuario confirmado (2 días, 30 min, equipo completo, sin limitaciones) con consentimiento y
//   cribado superado, como checkin.mjs, y genera su plan con IA real por /api/plan.
// - Cinco sesiones por la UI a 360 px, con el paso de los días simulado moviendo started_at
//   y calibrated_at por admin (ended_at no: lo protege un disparador; la app ordena por started_at):
//   S1 día A calibración (cada prueba con el máximo del rango y "2" de reserva: fija el peso),
//   S2 día B calibración, S3 día A normal (todas las series en el máximo salvo: X1 con Molestia tras la
//   1.ª serie y X2 una repetición por debajo del máximo), S4 día B saltado entero y S5 día A.
// - Comprueba: exercise_state tras la calibración; que la precarga de S3 y S5 sale de exercise_state
//   según nextPrescription (src/lib/domain/progression.ts, importada tal cual) y que en S5 suben los que
//   llegaron al máximo dos sesiones seguidas, X1 (Molestia) no sube y queda marcado y X2 se mantiene;
//   el fin de sesión, Progreso, y que Ajustes (tema y descanso) persiste tras cerrar sesión y volver a
//   entrar en otro navegador. Capturas e informe JSON con hallazgos por severidad.
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
// La regla de verdad, la misma función pura que usa el servidor (D28).
const { nextPrescription } = await import(pathToFileURL(path.resolve("src/lib/domain/progression.ts")).href);

const base = process.argv[2] ?? "http://localhost:3000";
const ts = Date.now();
const outDir = path.join(process.env.E2E_OUT ?? "e2e-out", `memoria-${ts}`);
fs.mkdirSync(outDir, { recursive: true });
const report = { script: "memoria", ts, steps: [], findings: [], consoleErrors: [], sesiones: [], precargas: {} };
const step = (name, ok, extra = {}) => report.steps.push({ name, ok, ...extra });
const finding = (severity, text, captura) => report.findings.push({ severity, text, ...(captura ? { captura } : {}) });
const check = (ok, severity, text, captura) => {
  if (!ok) finding(severity, text, captura);
  return ok;
};

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
const must = (res, what) => {
  if (res.error) throw new Error(`${what}: ${res.error.code ?? res.error.message}`);
  return res.data;
};
const email = `e2e-memoria-${ts}@buddy.test`;
const password = `Prueba-${Math.random().toString(36).slice(2)}-X9`;
const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
if (!created.data.user) throw new Error(`no se pudo crear el usuario: ${created.error?.code}`);
const userId = created.data.user.id;
report.userId = userId;
const EXPERIENCE = "6_meses_2_anos";
const equipmentRows = must(await admin.from("equipment_types").select("id, increment_kg, min_kg"), "equipo");
must(await admin.from("onboarding_answers").insert({ user_id: userId, focus: "equilibrado", experience: EXPERIENCE, days_per_week: 2, minutes_per_session: 30, sports: [] }), "respuestas");
must(await admin.from("gym_profiles").insert({ user_id: userId, preset: "completo", equipment_type_ids: equipmentRows.map((e) => e.id) }), "gimnasio");
must(await admin.from("consents").insert({ user_id: userId, version: "salud-2026-11-v1" }), "consentimiento");
must(await admin.from("health_profile").insert({ user_id: userId, limitations: [], screening_version: "cribado-2026-11-v1", screening_passed_at: new Date().toISOString() }), "salud");
const equipmentById = new Map(equipmentRows.map((e) => [e.id, { incrementKg: Number(e.increment_kg), minKg: Number(e.min_kg) }]));
const exercises = must(await admin.from("exercises").select("id, name, equipment_type_id, calibration_load_kg"), "catálogo");
const exById = new Map(exercises.map((e) => [e.id, e]));
const idByName = new Map(exercises.map((e) => [e.name, e.id]));

const browser = await chromium.launch();
let context;
let page;
let shot = 0;
const openContext = async () => {
  context = await browser.newContext({ viewport: { width: 360, height: 640 } });
  page = await context.newPage();
  page.on("console", (m) => m.type() === "error" && report.consoleErrors.push(`${page.url().replace(base, "")}: ${m.text().slice(0, 200)}`));
  page.on("pageerror", (e) => report.consoleErrors.push(`pageerror ${page.url().replace(base, "")}: ${String(e).slice(0, 200)}`));
};
const snap = async (name, fullPage = false) => {
  const file = path.join(outDir, `${String(++shot).padStart(2, "0")}-${name}.png`);
  await page.screenshot({ path: file, fullPage });
  return file;
};
const urlIs = (re, timeout = 20000) => page.waitForURL(re, { timeout });
const login = async () => {
  await page.goto(`${base}/entrar`);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Contraseña").fill(password);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/entrar"), { timeout: 30000 });
};
const kg = (text) => Number(String(text ?? "").replace(/[^\d,.]/g, "").replace(",", "."));
const has = async (role, name) => (await page.getByRole(role, { name, exact: typeof name === "string" }).count()) > 0;
const enabledButton = async (name) => {
  const b = page.getByRole("button", { name, exact: true }).first();
  await b.waitFor({ timeout: 15000 });
  await page.waitForFunction((n) => {
    const x = [...document.querySelectorAll("button")].find((y) => y.textContent?.trim() === n);
    return x && !x.disabled;
  }, name, { timeout: 15000 });
  return b;
};
// Lleva el contador de repeticiones (normal o respuesta de calibración) al valor pedido.
const setReps = async (target) => {
  for (let i = 0; i < 60; i++) {
    const plus = page.getByRole("button", { name: /^Más repeticiones, ahora \d+$/ }).first();
    const now = Number((await plus.getAttribute("aria-label")).match(/(\d+)$/)[1]);
    if (now === target) return;
    if (now < target) await plus.click();
    else await page.getByRole("button", { name: /^Menos repeticiones, ahora \d+$/ }).first().click();
  }
  throw new Error(`no se pudo poner ${target} repeticiones`);
};

// Reglas del día de una sesión: series y rango de cada ejercicio.
async function rulesFor(sessionId) {
  const ws = must(await admin.from("workout_sessions").select("plan_session_id").eq("id", sessionId).single(), "sesión");
  const slots = must(await admin.from("plan_slots").select("exercise_id, sets, rep_min, rep_max, position").eq("plan_session_id", ws.plan_session_id).order("position"), "huecos");
  return new Map(slots.filter((s) => s.exercise_id).map((s) => [s.exercise_id, { sets: s.sets, min: s.rep_min, max: s.rep_max }]));
}

// Historial para nextPrescription, construido a partir de la base de datos (sesiones cerradas en orden).
async function expectedPrescription(exerciseId, rule) {
  const state = must(await admin.from("exercise_state").select("working_weight_kg, increment_kg_override").eq("user_id", userId).eq("exercise_id", exerciseId).maybeSingle(), "estado");
  const closed = must(await admin.from("workout_sessions").select("id").eq("user_id", userId).not("ended_at", "is", null).order("started_at"), "sesiones");
  const sets = must(await admin.from("set_logs").select("session_id, set_index, weight_kg, reps, status").eq("user_id", userId).eq("exercise_id", exerciseId), "series");
  const marks = new Set(must(await admin.from("discomfort_marks").select("session_id").eq("user_id", userId).eq("exercise_id", exerciseId), "marcas").map((m) => m.session_id));
  const history = [];
  for (const { id } of closed) {
    const own = sets.filter((s) => s.session_id === id).sort((a, b) => a.set_index - b.set_index);
    const discomfort = marks.has(id) || own.some((s) => s.status === "detenida");
    const counted = own.filter((s) => s.status !== "detenida");
    if (counted.length === 0 && !discomfort) continue;
    const done = counted.filter((s) => s.status === "hecha");
    const freq = new Map();
    for (const s of done) freq.set(Number(s.weight_kg), (freq.get(Number(s.weight_kg)) ?? 0) + 1);
    let load = done.at(-1) ? Number(done.at(-1).weight_kg) : (counted.at(-1) ? Number(counted.at(-1).weight_kg) : 0);
    for (const s of [...done].reverse()) if (freq.get(Number(s.weight_kg)) > (freq.get(load) ?? 0)) load = Number(s.weight_kg);
    history.push({ loadKg: load, sets: counted.map((s) => ({ reps: s.reps, skipped: s.status === "saltada" })), discomfort });
  }
  const eq = equipmentById.get(exById.get(exerciseId).equipment_type_id);
  const machine = { id: "x", incrementKg: state?.increment_kg_override ? Number(state.increment_kg_override) : eq.incrementKg, minKg: eq.minKg };
  const current = Number(state?.working_weight_kg);
  return { current, next: nextPrescription({ currentLoadKg: current, repRange: { min: rule.min, max: rule.max }, history }, machine), incrementKg: machine.incrementKg };
}

// Recorre la sesión abierta. `plan(exerciseId)` decide: "cal" (calibración con el máximo y reserva 2),
// "top" (todas las series en el máximo), "below" (una por debajo del máximo), "molestia" (1 serie en el
// máximo y Molestia) o "skip" (Saltar hoy). Devuelve lo visto en la UI por ejercicio.
async function runSession(n, plan) {
  await urlIs(/\/sesion\/[0-9a-f-]{36}$/, 30000);
  const sessionId = page.url().match(/\/sesion\/([0-9a-f-]{36})/)[1];
  const rules = await rulesFor(sessionId);
  const seen = {};
  let taps = 0;
  for (let guard = 0; guard < 200; guard++) {
    await page.waitForTimeout(300);
    if (/\/fin$/.test(page.url())) break;
    if ((await page.getByRole("dialog").count()) > 0 && !(await has("button", "Ahora no")) && !(await has("button", "Parar este ejercicio"))) continue;
    if (await has("button", "Ahora no")) {
      await page.getByRole("button", { name: "Ahora no" }).click();
      continue;
    }
    const name = (await page.locator("header h1").first().textContent({ timeout: 3000 }).catch(() => null))?.trim();
    if (!name) {
      await page.waitForURL(/\/fin$/, { timeout: 15000 }).catch(() => {});
      continue;
    }
    const id = idByName.get(name);
    const rule = rules.get(id);
    const mode = plan(id);
    const ex = (seen[id] ??= { name, mode, paso: null, nivelArriba: false, series: 0, molestia: false });
    if (await has("button", "Empezar")) {
      if (ex.paso === null) {
        ex.paso = kg(await page.locator(".ss-plan-kg").first().textContent());
        if (Object.keys(seen).length === 1) await snap(`s${n}-paso`);
      }
      await page.getByRole("button", { name: "Empezar", exact: true }).click();
      continue;
    }
    const main = (await page.locator("main").first().getAttribute("aria-label")) ?? "";
    // Respuesta de una prueba de calibración.
    if (main.startsWith("Prueba ")) {
      await setReps(rule.max);
      await page.getByRole("group", { name: /Cuántas más/ }).getByRole("button", { name: "2", exact: true }).click();
      ex.series++;
      taps++;
      await page.waitForTimeout(900);
      continue;
    }
    if (main.startsWith("Calibración de ")) {
      if (ex.series === 0 && Object.keys(seen).length === 1) await snap(`s${n}-calibracion`);
      await (await enabledButton("Serie hecha")).click();
      continue;
    }
    if (!(await has("button", "Serie hecha"))) continue;
    // Serie normal.
    if (ex.series === 0) {
      ex.nivelArriba = (await page.locator(".ss-levelup").count()) > 0;
      ex.peso = kg(await page.locator(".ss-stat-num").first().textContent());
      ex.reps = Number((await page.locator(".ss-stat-num").nth(1).textContent())?.trim());
      if (ex.nivelArriba) await snap(`s${n}-nivel-arriba-${id}`);
    }
    if (mode === "skip") {
      // Un solo toque por ejercicio: mientras se guarda, el botón sigue en pantalla pero desactivado.
      if (!ex.saltado) {
        await (await enabledButton("Saltar hoy")).click();
        ex.saltado = true;
      }
      await page.waitForTimeout(800);
      continue;
    }
    if (mode === "molestia" && ex.series >= 1 && !ex.molestia) {
      await page.getByRole("button", { name: /^Tengo molestia/ }).click();
      await snap(`s${n}-molestia`);
      await page.getByRole("button", { name: "Parar este ejercicio" }).click();
      await page.waitForFunction(() => !document.querySelector("[role=dialog]") || /Ahora no/.test(document.body.innerText), null, { timeout: 15000 });
      ex.molestia = true;
      continue;
    }
    await setReps(mode === "below" ? rule.max - 1 : rule.max);
    await (await enabledButton("Serie hecha")).click();
    ex.series++;
    taps++;
    await page.waitForTimeout(500);
  }
  await urlIs(/\/sesion\/[0-9a-f-]{36}\/fin$/, 30000);
  await page.waitForLoadState("networkidle");
  const finShot = await snap(`s${n}-fin`);
  return { sessionId, rules, seen, taps, finShot };
}

async function startFromHoy(n) {
  await page.goto(`${base}/hoy`);
  await page.locator(".wz-cta").last().waitFor({ timeout: 20000 });
  const kicker = (await page.getByText(/^Día \d de \d$/).first().textContent().catch(() => "")) ?? "";
  const label = ((await page.locator(".wz-cta").last().textContent()) ?? "").trim();
  await snap(`s${n}-hoy`);
  await page.locator(".wz-cta").last().click();
  return { kicker, label };
}

// Simula que la sesión fue hace `days` días: started_at y las calibraciones de esa sesión.
async function shiftDays(sessionId, days) {
  const ws = must(await admin.from("workout_sessions").select("started_at, ended_at").eq("id", sessionId).single(), "sesión");
  const delta = days * 24 * 3600e3;
  const move = (iso) => new Date(new Date(iso).getTime() - delta).toISOString();
  const states = must(await admin.from("exercise_state").select("exercise_id, calibrated_at").eq("user_id", userId).gte("calibrated_at", ws.started_at), "estado");
  for (const s of states) must(await admin.from("exercise_state").update({ calibrated_at: move(s.calibrated_at) }).eq("user_id", userId).eq("exercise_id", s.exercise_id), "mover calibración");
  // ended_at no se puede mover: el disparador workout_sessions_cerrar_una_vez (D64) lo impide incluso por
  // admin. Basta con started_at: la app ordena el historial por started_at.
  must(await admin.from("workout_sessions").update({ started_at: move(ws.started_at) }).eq("id", sessionId), "mover sesión");
}

try {
  await openContext();
  await login();
  const plan = await page.evaluate(async () => {
    const r = await fetch("/api/plan", { method: "POST" });
    return { http: r.status, ...(await r.json()) };
  });
  if (plan.status !== "ok") throw new Error(`plan: ${plan.status}`);
  step("plan", true);

  // --- S1: día A, calibración ------------------------------------------------------------------------
  const h1 = await startFromHoy(1);
  check(/Empezar calibración/.test(h1.label), "media", `Hoy, sesión 1: el botón dice «${h1.label}»`);
  const s1 = await runSession(1, () => "cal");
  const states1 = must(await admin.from("exercise_state").select("exercise_id, working_weight_kg, calibrated_at").eq("user_id", userId), "estado");
  const dayA = [...s1.rules.keys()];
  const fixed = {};
  for (const id of dayA) {
    const ex = exById.get(id);
    const eq = equipmentById.get(ex.equipment_type_id);
    const start = Math.max(Number(ex.calibration_load_kg), eq.minKg); // experiencia 6 meses–2 años: sin salto
    const st = states1.find((s) => s.exercise_id === id);
    fixed[id] = st ? Number(st.working_weight_kg) : null;
    check(!!st?.calibrated_at, "alta", `S1: ${id} no queda calibrado en exercise_state`, s1.finShot);
    check(fixed[id] === start, "alta", `S1: ${id} fijado en ${fixed[id]} kg, se esperaba la carga de inicio ${start} kg (prueba con el máximo y 2 de reserva)`, s1.finShot);
    check(s1.seen[id]?.paso === start, "media", `S1: la pantalla de paso de ${id} muestra ${s1.seen[id]?.paso} kg y la carga de inicio es ${start} kg`);
  }
  const finWins1 = await page.getByText("Peso fijado").count();
  check(finWins1 >= dayA.length, "baja", `S1: el fin muestra ${finWins1} «Peso fijado» para ${dayA.length} ejercicios`, s1.finShot);
  report.sesiones.push({ n: 1, dia: h1.kicker, ejercicios: dayA, toques: s1.taps, fijado: fixed });
  await shiftDays(s1.sessionId, 4);
  step("s1_calibracion", true);

  // --- S2: día B, calibración --------------------------------------------------------------------------
  const h2 = await startFromHoy(2);
  check(/Día 2 de 2/.test(h2.kicker), "media", `Hoy tras S1 dice «${h2.kicker}»`);
  const s2 = await runSession(2, () => "cal");
  const dayB = [...s2.rules.keys()];
  report.sesiones.push({ n: 2, dia: h2.kicker, ejercicios: dayB, toques: s2.taps });
  await shiftDays(s2.sessionId, 3);
  step("s2_calibracion", true);

  // --- S3: día A normal; X1 Molestia tras la 1.ª serie, X2 por debajo del máximo ----------------------
  const h3 = await startFromHoy(3);
  check(/Día 1 de 2/.test(h3.kicker) && /Empezar sesión/.test(h3.label), "media", `Hoy, S3: «${h3.kicker}», botón «${h3.label}»`);
  // Un ejercicio que esté en los dos días tiene más historial (S2 y S4): la regla simple solo se aplica a
  // los exclusivos del día A; los compartidos se comprueban solo contra nextPrescription.
  const shared = new Set(dayA.filter((id) => dayB.includes(id)));
  report.compartidos = [...shared];
  const own = dayA.filter((id) => !shared.has(id));
  if (own.length < 3) finding("info", `Solo ${own.length} ejercicios exclusivos del día A: la prueba de la regla es más débil`);
  const [x1, x2] = own.length >= 2 ? own : dayA;
  report.x1 = x1;
  report.x2 = x2;
  // Precarga esperada antes de empezar (la sesión aún no existe: el historial es S1 y S2).
  const expected3 = {};
  for (const id of dayA) expected3[id] = await expectedPrescription(id, s1.rules.get(id));
  const s3 = await runSession(3, (id) => (id === x1 ? "molestia" : id === x2 ? "below" : "top"));
  report.precargas.s3 = {};
  for (const id of dayA) {
    const e = expected3[id];
    const ui = s3.seen[id];
    report.precargas.s3[id] = { estado: e.current, esperado: e.next, ui: ui && { paso: ui.paso, peso: ui.peso, reps: ui.reps, nivelArriba: ui.nivelArriba } };
    if (!shared.has(id)) check(e.current === fixed[id], "alta", `S3: exercise_state de ${id} = ${e.current}, fijado en S1 ${fixed[id]}`);
    check(ui?.paso === e.next.loadKg && ui?.peso === e.next.loadKg, "alta", `S3: ${id} precarga ${ui?.paso}/${ui?.peso} kg; según exercise_state y la doble progresión, ${e.next.loadKg} kg`);
    check(ui?.reps === e.next.reps, "media", `S3: ${id} precarga ${ui?.reps} repeticiones; según la doble progresión, ${e.next.reps}`);
    check(Boolean(ui?.nivelArriba) === e.next.loadKg > e.current, "alta", `S3: ${id} «Nivel arriba» = ${ui?.nivelArriba} y la doble progresión ${e.next.loadKg > e.current ? "sí" : "no"} sube`);
  }
  const quiet = await page.getByText(`${exById.get(x1).name}: parado hoy. No sube carga.`).count();
  check(quiet > 0, "media", `S3: el fin no dice que ${x1} se paró hoy`, s3.finShot);
  const marks = must(await admin.from("discomfort_marks").select("exercise_id, session_id").eq("user_id", userId), "marcas");
  check(marks.some((m) => m.exercise_id === x1 && m.session_id === s3.sessionId), "alta", `S3: ${x1} no queda marcado en discomfort_marks`);
  const stopped = must(await admin.from("set_logs").select("status").eq("session_id", s3.sessionId).eq("exercise_id", x1), "series x1");
  check(stopped.some((s) => s.status === "detenida"), "alta", `S3: ${x1} sin fila «detenida»`);
  const states3 = must(await admin.from("exercise_state").select("exercise_id, working_weight_kg").eq("user_id", userId).in("exercise_id", dayA), "estado");
  for (const s of states3.filter((x) => !shared.has(x.exercise_id))) check(Number(s.working_weight_kg) === fixed[s.exercise_id], "alta", `S3: la carga de trabajo de ${s.exercise_id} cambió a ${s.working_weight_kg} sin cambiar el peso`);
  report.sesiones.push({ n: 3, dia: h3.kicker, toques: s3.taps, molestia: x1, porDebajo: x2 });
  await shiftDays(s3.sessionId, 2);
  step("s3_normal", true);

  // --- S4: día B, todo saltado -----------------------------------------------------------------------
  const h4 = await startFromHoy(4);
  const s4 = await runSession(4, () => "skip");
  const skipped = must(await admin.from("set_logs").select("status").eq("session_id", s4.sessionId), "series s4");
  check(skipped.length > 0 && skipped.every((s) => s.status === "saltada"), "media", `S4: filas de la sesión saltada: ${JSON.stringify(skipped.map((s) => s.status))}`);
  report.sesiones.push({ n: 4, dia: h4.kicker, saltada: true });
  await shiftDays(s4.sessionId, 1);
  step("s4_saltada", true);

  // --- S5: día A, hoy. Suben los que llegaron al máximo en S1 y S3; X1 y X2 no ---------------------
  const h5 = await startFromHoy(5);
  check(/Día 1 de 2/.test(h5.kicker), "media", `Hoy, S5: «${h5.kicker}»`);
  const expected5 = {};
  for (const id of dayA) expected5[id] = await expectedPrescription(id, s1.rules.get(id));
  const s5 = await runSession(5, () => "top");
  report.precargas.s5 = {};
  let risers = 0;
  for (const id of dayA) {
    const e = expected5[id];
    const ui = s5.seen[id];
    const rule = shared.has(id) ? "compartido con el día B: solo nextPrescription" : id === x1 ? "molestia: no sube" : id === x2 ? "por debajo: se mantiene" : "máximo dos sesiones: sube";
    const want = shared.has(id) ? e.next.loadKg : id === x1 || id === x2 ? fixed[id] : fixed[id] + e.incrementKg;
    if (e.next.loadKg > e.current) risers++;
    report.precargas.s5[id] = { regla: rule, estado: e.current, esperadoRegla: want, nextPrescription: e.next, ui: ui && { paso: ui.paso, peso: ui.peso, reps: ui.reps, nivelArriba: ui.nivelArriba } };
    check(e.next.loadKg === want, "alta", `S5: nextPrescription da ${e.next.loadKg} kg para ${id} y la regla (${rule}) pide ${want} kg`);
    check(ui?.paso === e.next.loadKg && ui?.peso === e.next.loadKg, "critica", `S5: ${id} (${rule}) precarga ${ui?.paso}/${ui?.peso} kg y se esperaban ${e.next.loadKg} kg`);
    check(Boolean(ui?.nivelArriba) === e.next.loadKg > e.current, "alta", `S5: ${id} (${rule}) «Nivel arriba» = ${ui?.nivelArriba}`);
  }
  const levelUps = await page.getByText(/^Nivel arriba \+/).count();
  check(levelUps === risers, "media", `S5: el fin muestra ${levelUps} «Nivel arriba» y subieron ${risers} ejercicios`, s5.finShot);
  const states5 = must(await admin.from("exercise_state").select("exercise_id, working_weight_kg").eq("user_id", userId).in("exercise_id", dayA), "estado");
  for (const s of states5) {
    // Tras S5 hecha con la precarga, la carga de trabajo es la precarga.
    const want = expected5[s.exercise_id].next.loadKg;
    check(Number(s.working_weight_kg) === want, "alta", `S5: exercise_state de ${s.exercise_id} = ${s.working_weight_kg}, se esperaba ${want}`);
  }
  report.sesiones.push({ n: 5, dia: h5.kicker, toques: s5.taps, suben: risers });
  step("s5_progresion", true, { suben: risers });

  // --- Progreso refleja las sesiones -----------------------------------------------------------------
  await page.goto(`${base}/progreso`);
  await page.waitForLoadState("networkidle");
  const progShot = await snap("progreso", true);
  const progText = (await page.locator("body").textContent()) ?? "";
  const closed = must(await admin.from("workout_sessions").select("id").eq("user_id", userId).not("ended_at", "is", null), "sesiones");
  report.progreso = { cerradas: closed.length };
  check(closed.length === 5, "alta", `Hay ${closed.length} sesiones cerradas, se hicieron 5`);
  check(progText.includes(`${closed.length} sesiones hechas`), "alta", `Progreso no dice «${closed.length} sesiones hechas»`, progShot);
  const bestGain = Math.max(0, ...own.filter((id) => id !== x1 && id !== x2).map((id) => expected5[id].next.loadKg - fixed[id]));
  check(new RegExp(`\\+${String(bestGain).replace(".", ",")}`).test(progText), "media", `Progreso no muestra la mayor subida (+${bestGain} kg)`, progShot);
  for (const id of dayA) check(progText.includes(exById.get(id).name), "media", `Progreso no lista ${id}`, progShot);
  step("progreso", true);

  // --- Ajustes persiste tras cerrar sesión y volver a entrar en otro navegador -----------------------
  await page.goto(`${base}/ajustes`);
  await page.getByRole("radio", { name: "Oscuro", exact: true }).click();
  await page.waitForTimeout(1200);
  await page.getByRole("radiogroup", { name: "Mostrar el contador de descanso" }).getByRole("radio", { name: "No", exact: true }).click();
  await page.waitForTimeout(1500);
  await snap("ajustes-cambiados", true);
  const settings = must(await admin.from("user_settings").select("theme, show_rest_timer").eq("user_id", userId).single(), "ajustes");
  report.ajustes = settings;
  check(settings.theme === "dark" && settings.show_rest_timer === false, "alta", `user_settings tras cambiar: ${JSON.stringify(settings)}`);
  await page.getByRole("button", { name: "Cerrar sesión", exact: true }).click();
  await page.waitForURL((u) => u.pathname === "/" || u.pathname.startsWith("/entrar"), { timeout: 20000 });
  await page.goto(`${base}/hoy`);
  check(/\/entrar/.test(page.url()), "alta", `Tras cerrar sesión, /hoy no pide entrar (${page.url().replace(base, "")})`);
  await context.close();
  await openContext();
  await login();
  await page.goto(`${base}/ajustes`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(800);
  const ajShot = await snap("ajustes-tras-volver", true);
  const dark = await page.evaluate(() => document.documentElement.classList.contains("dark"));
  const darkChecked = await page.getByRole("radio", { name: "Oscuro", exact: true }).getAttribute("aria-checked");
  const restNo = await page.getByRole("radiogroup", { name: "Mostrar el contador de descanso" }).getByRole("radio", { name: "No", exact: true }).getAttribute("aria-checked");
  check(dark, "alta", "Tras volver a entrar en otro navegador, el tema oscuro no se aplica", ajShot);
  check(darkChecked === "true", "alta", "Tras volver a entrar, Ajustes no marca «Oscuro»", ajShot);
  check(restNo === "true", "alta", "Tras volver a entrar, Ajustes no marca el descanso en «No»", ajShot);
  await page.goto(`${base}/hoy`);
  await page.waitForLoadState("networkidle");
  const hoyDark = await page.evaluate(() => document.documentElement.classList.contains("dark"));
  const hoyShot = await snap("hoy-oscuro-tras-volver");
  check(hoyDark, "media", "Hoy no sale en oscuro tras volver a entrar", hoyShot);
  // Sin contador de descanso: la sesión no lo muestra tras una serie.
  await page.locator(".wz-cta").last().click();
  await urlIs(/\/sesion\/[0-9a-f-]{36}$/, 30000);
  await (await enabledButton("Empezar")).click();
  const calib = ((await page.locator("main").first().getAttribute("aria-label")) ?? "").startsWith("Calibración");
  if (!calib) {
    await (await enabledButton("Serie hecha")).click();
    await page.waitForTimeout(2500);
    const restShown = (await page.locator(".ss-rest").count()) > 0;
    const restShot = await snap("sesion-sin-descanso");
    check(!restShown, "media", "Con el contador de descanso en «No», la sesión lo muestra", restShot);
  }
  step("ajustes_persisten", true, settings);
} catch (error) {
  step("error", false, { error: String(error).slice(0, 400), url: page?.url() });
  const f = await snap("parada").catch(() => null);
  finding("alta", `Se paró en ${page?.url().replace(base, "")}: ${String(error).slice(0, 300)}`, f ?? undefined);
} finally {
  await browser.close();
  report.ok = report.findings.every((f) => f.severity === "info");
  fs.writeFileSync(path.join(outDir, "informe.json"), JSON.stringify(report, null, 2));
  if (!process.env.E2E_KEEP) await admin.auth.admin.deleteUser(userId);
  console.log(JSON.stringify({ script: "memoria", ok: report.ok, outDir, steps: report.steps.map((s) => `${s.ok ? "ok" : "KO"} ${s.name}`), findings: report.findings, precargas: report.precargas, consoleErrors: report.consoleErrors }, null, 1));
}
