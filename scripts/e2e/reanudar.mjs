// Reanudar una sesión a medias en staging (QA del 20/11/2026). Uso: node scripts/e2e/reanudar.mjs [baseUrl]
// - Crea un usuario confirmado con respuestas, gimnasio, consentimiento y cribado superado (como
//   ciclo.mjs y checkin.mjs), genera su plan con IA real por /api/plan y marca sus ejercicios como ya
//   calibrados (exercise_state por admin), para que la sesión del día sea normal.
// - En el navegador, a 360 px: doble toque en "Empezar sesión", 2 series, recarga a media sesión,
//   cerrar el navegador y volver a entrar por /entrar en otro contexto, botón atrás a media sesión
//   (también justo después de "Serie hecha"), terminar, recargar /fin y volver atrás desde /fin.
// - Comprueba en la base de datos: una sola sesión en workout_sessions, cerrada una vez, y tantas
//   series como se tocaron en la UI. Capturas e informe JSON con hallazgos por severidad.
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

const base = process.argv[2] ?? "http://localhost:3000";
const ts = Date.now();
const outDir = path.join(process.env.E2E_OUT ?? "e2e-out", `reanudar-${ts}`);
fs.mkdirSync(outDir, { recursive: true });
const report = { script: "reanudar", ts, steps: [], findings: [], consoleErrors: [], series: { tocadas: 0 } };
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
const email = `e2e-reanudar-${ts}@buddy.test`;
const password = `Prueba-${Math.random().toString(36).slice(2)}-X9`;
const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
if (!created.data.user) throw new Error(`no se pudo crear el usuario: ${created.error?.code}`);
const userId = created.data.user.id;
report.userId = userId;
const equipment = must(await admin.from("equipment_types").select("id"), "equipo").map((e) => e.id);
must(await admin.from("onboarding_answers").insert({ user_id: userId, focus: "equilibrado", experience: "6_meses_2_anos", days_per_week: 2, minutes_per_session: 60, sports: [] }), "respuestas");
must(await admin.from("gym_profiles").insert({ user_id: userId, preset: "completo", equipment_type_ids: equipment }), "gimnasio");
must(await admin.from("consents").insert({ user_id: userId, version: "salud-2026-11-v1" }), "consentimiento");
must(await admin.from("health_profile").insert({ user_id: userId, limitations: [], screening_version: "cribado-2026-11-v1", screening_passed_at: new Date().toISOString() }), "salud");

const browser = await chromium.launch();
let context;
let page;
let shot = 0;
const watch = (p) => {
  p.on("console", (m) => m.type() === "error" && report.consoleErrors.push(`${p.url().replace(base, "")}: ${m.text().slice(0, 200)}`));
  p.on("pageerror", (e) => report.consoleErrors.push(`pageerror ${p.url().replace(base, "")}: ${String(e).slice(0, 200)}`));
};
const openContext = async () => {
  context = await browser.newContext({ viewport: { width: 360, height: 640 } });
  page = await context.newPage();
  watch(page);
};
const snap = async (name) => {
  const file = path.join(outDir, `${String(++shot).padStart(2, "0")}-${name}.png`);
  await page.screenshot({ path: file });
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
const sessions = async () => must(await admin.from("workout_sessions").select("id, started_at, ended_at, kind").eq("user_id", userId).order("started_at"), "sesiones");
const setRows = async () => must(await admin.from("set_logs").select("id, session_id, exercise_id, set_index, status, weight_kg, reps").eq("user_id", userId), "series");
// Espera a que la base de datos tenga `n` series hechas (el guardado va después de pintar).
const waitSets = async (n, timeout = 15000) => {
  const t0 = Date.now();
  let rows = [];
  while (Date.now() - t0 < timeout) {
    rows = (await setRows()).filter((r) => r.status === "hecha");
    if (rows.length >= n) return rows;
    await new Promise((r) => setTimeout(r, 500));
  }
  return rows;
};
let names = new Map();
let setsPlan = new Map();
// Lo que la UI debería mostrar de un ejercicio según la base de datos: series hechas y series del plan.
const expected = async (name) => {
  const id = [...names.entries()].find(([, n]) => n === name)?.[0];
  const rows = (await setRows()).filter((r) => r.exercise_id === id && r.status === "hecha");
  return { exerciseId: id ?? null, hechas: rows.length, sets: setsPlan.get(id) ?? null };
};
const sessionId = () => page.url().match(/\/sesion\/([0-9a-f-]{36})/)?.[1] ?? null;
const dismissSheets = async () => {
  if ((await page.getByRole("button", { name: "Ahora no" }).count()) > 0) await page.getByRole("button", { name: "Ahora no" }).click();
};
// Serie normal: "Empezar" si está en la pantalla de paso y después "Serie hecha".
const doSet = async () => {
  await dismissSheets();
  const empezar = page.getByRole("button", { name: "Empezar", exact: true });
  if ((await empezar.count()) > 0) await empezar.click();
  const done = page.getByRole("button", { name: "Serie hecha", exact: true });
  await done.waitFor({ timeout: 15000 });
  await page.waitForFunction(() => {
    const b = [...document.querySelectorAll("button")].find((x) => x.textContent?.trim() === "Serie hecha");
    return b && !b.disabled;
  }, null, { timeout: 15000 });
  await done.click();
  report.series.tocadas++;
};
const currentInfo = async () => ({
  ejercicio: (await page.locator("header h1").first().textContent().catch(() => null))?.trim() ?? null,
  serie: (await page.locator(".ss-sets span").first().textContent().catch(() => null))?.trim() ?? null,
  hechas: await page.getByRole("button", { name: /hecha. Tocar para corregirla/ }).count(),
});

try {
  await openContext();
  await login();
  step("entrar", true);

  const plan = await page.evaluate(async () => {
    const r = await fetch("/api/plan", { method: "POST" });
    return { http: r.status, ...(await r.json()) };
  });
  if (plan.status !== "ok") throw new Error(`plan: ${plan.status}`);
  // Ejercicios ya calibrados ayer: la sesión de hoy es normal (la calibración la cubre memoria.mjs).
  const active = must(await admin.from("plans").select("id").eq("user_id", userId).eq("is_active", true).single(), "plan activo");
  const ps = must(await admin.from("plan_sessions").select("id").eq("plan_id", active.id), "días");
  const slots = must(await admin.from("plan_slots").select("exercise_id, sets").in("plan_session_id", ps.map((s) => s.id)), "huecos");
  const ids = [...new Set(slots.map((s) => s.exercise_id).filter(Boolean))];
  setsPlan = new Map(slots.filter((s) => s.exercise_id).map((s) => [s.exercise_id, s.sets]));
  names = new Map(must(await admin.from("exercises").select("id, name"), "nombres").map((e) => [e.id, e.name]));
  // Los ejercicios del día y sus posibles alternativas (por si el plan ofrece una en su lugar).
  const catalog = must(await admin.from("exercises").select("id"), "catálogo").map((e) => e.id);
  const yesterday = new Date(Date.now() - 24 * 3600e3).toISOString();
  must(await admin.from("exercise_state").upsert(catalog.map((id) => ({ user_id: userId, exercise_id: id, working_weight_kg: 20, calibrated_at: yesterday }))), "estado");
  step("plan_y_estado", true, { ejercicios: ids.length });

  // --- Empezar con doble toque ------------------------------------------------------------------
  await page.goto(`${base}/hoy`);
  const start = page.getByRole("button", { name: "Empezar sesión" });
  await start.waitFor({ timeout: 20000 });
  await snap("hoy");
  await start.dblclick();
  await urlIs(/\/sesion\/[0-9a-f-]{36}$/, 30000);
  const sid = sessionId();
  report.sessionId = sid;
  await page.waitForTimeout(1500);
  const afterStart = await sessions();
  check(afterStart.length === 1, "alta", `Doble toque en «Empezar sesión» abre ${afterStart.length} sesiones`);
  check(afterStart[0]?.kind === "normal", "media", `La sesión es de tipo ${afterStart[0]?.kind}, se esperaba normal (ejercicios calibrados)`);
  await snap("sesion-paso");
  step("empezar", true, { sessionId: sid });

  // --- 2 series y recarga -----------------------------------------------------------------------
  await doSet();
  await page.waitForTimeout(700);
  await doSet();
  const two = await waitSets(2);
  check(two.length === 2, "alta", `Tras 2 «Serie hecha» hay ${two.length} series en la base de datos`);
  const before = await currentInfo();
  await snap("dos-series");
  await page.reload();
  await page.getByRole("button", { name: /^(Serie hecha|Empezar)$/ }).first().waitFor({ timeout: 20000 }).catch(() => {});
  const reloaded = await currentInfo();
  const reloadShot = await snap("tras-recargar");
  const expectReload = await expected(reloaded.ejercicio);
  report.recarga = { antes: before, despues: reloaded, esperado: expectReload };
  check(sessionId() === sid, "alta", `Tras recargar la URL cambió a ${page.url().replace(base, "")}`, reloadShot);
  check(reloaded.ejercicio === before.ejercicio, "alta", `Tras recargar cambia el ejercicio: «${before.ejercicio}» → «${reloaded.ejercicio}»`, reloadShot);
  check(expectReload.hechas > 0 || before.hechas === 0, "info", "La recarga no cayó a mitad de un ejercicio (prueba menos fuerte)");
  check(reloaded.hechas === expectReload.hechas, "alta", `Tras recargar se ven ${reloaded.hechas} series hechas de «${reloaded.ejercicio}» y en la base de datos hay ${expectReload.hechas}`, reloadShot);
  if (reloaded.serie) {
    const want = `Serie ${Math.min(expectReload.hechas + 1, expectReload.sets)} de ${expectReload.sets}`;
    check(reloaded.serie.startsWith(want), "alta", `Tras recargar el contador dice «${reloaded.serie}» (esperado «${want}»)`, reloadShot);
  }
  await doSet();
  const three = await waitSets(3);
  check(three.length === 3, "alta", `Tras continuar hay ${three.length} series`);
  step("recargar_y_continuar", true, report.recarga);

  // --- Cerrar el navegador y volver a entrar ----------------------------------------------------
  const beforeClose = await currentInfo();
  await context.close();
  await openContext();
  await page.goto(`${base}/hoy`);
  check(/\/entrar/.test(page.url()), "media", `Con otro navegador sin sesión, /hoy no lleva a /entrar (${page.url().replace(base, "")})`);
  await login();
  const landed = page.url().replace(base, "");
  await page.waitForLoadState("networkidle");
  const hoyShot = await snap("volver-a-entrar");
  check(/\/hoy/.test(landed) || /\/sesion\//.test(landed), "media", `Tras volver a entrar se va a ${landed}`, hoyShot);
  if (!/\/sesion\//.test(page.url())) {
    const seguir = page.getByRole("button", { name: "Seguir con la sesión" });
    const hasSeguir = await seguir.waitFor({ timeout: 15000 }).then(() => true).catch(() => false);
    check(hasSeguir, "alta", "Hoy no ofrece «Seguir con la sesión» con una sesión abierta", hoyShot);
    await page.locator(".wz-cta").last().click();
    await urlIs(/\/sesion\/[0-9a-f-]{36}$/, 30000);
  }
  check(sessionId() === sid, "critica", `Al retomar se abre otra sesión (${sessionId()} en vez de ${sid})`);
  await page.getByRole("button", { name: /Serie hecha|Empezar/ }).first().waitFor({ timeout: 20000 });
  const resumed = await currentInfo();
  const resumedShot = await snap("retomada");
  report.retomada = { antes: beforeClose, despues: resumed };
  check(resumed.ejercicio === beforeClose.ejercicio, "alta", `Al retomar cambia el ejercicio: «${beforeClose.ejercicio}» → «${resumed.ejercicio}»`, resumedShot);
  const expectResume = await expected(resumed.ejercicio);
  report.retomada.esperado = expectResume;
  check(resumed.hechas === expectResume.hechas, "alta", `Al retomar se ven ${resumed.hechas} series hechas de «${resumed.ejercicio}» y en la base de datos hay ${expectResume.hechas}`, resumedShot);
  const afterResume = await sessions();
  check(afterResume.length === 1, "critica", `Al retomar hay ${afterResume.length} filas en workout_sessions`);
  step("cerrar_y_retomar", true, report.retomada);

  // --- Atrás a media sesión ----------------------------------------------------------------------
  await page.goBack();
  await page.waitForLoadState("networkidle");
  const backUrl = page.url().replace(base, "");
  const backShot = await snap("atras");
  report.atras = backUrl;
  check(!/Esta página no existe/.test(await page.content()), "alta", `Atrás a media sesión lleva a una página que no existe (${backUrl})`, backShot);
  await page.goForward();
  await page.waitForLoadState("networkidle");
  if (!/\/sesion\//.test(page.url())) {
    await page.goto(`${base}/hoy`);
    await page.locator(".wz-cta").last().click();
    await urlIs(/\/sesion\/[0-9a-f-]{36}$/, 30000);
  }
  check(sessionId() === sid, "critica", `Tras atrás/adelante se abre otra sesión (${sessionId()})`);
  // Atrás justo después de tocar "Serie hecha": la serie no se puede perder.
  const n0 = (await waitSets(0)).length;
  await doSet();
  await page.goBack();
  await page.waitForTimeout(3000);
  const n1 = (await waitSets(n0 + 1, 8000)).length;
  const lostShot = await snap("atras-tras-serie");
  report.atrasTrasSerie = { antes: n0, despues: n1, url: page.url().replace(base, "") };
  check(n1 === n0 + 1, "alta", `Atrás justo después de «Serie hecha»: ${n0} → ${n1} series guardadas (se perdió la serie)`, lostShot);
  if (n1 !== n0 + 1) report.series.tocadas--;
  if (!/\/sesion\//.test(page.url())) {
    await page.goto(`${base}/hoy`);
    await page.locator(".wz-cta").last().click();
    await urlIs(/\/sesion\/[0-9a-f-]{36}$/, 30000);
  }
  check(sessionId() === sid, "critica", `Tras atrás se abre otra sesión (${sessionId()})`);
  check((await sessions()).length === 1, "critica", "Tras atrás hay más de una sesión");
  step("atras", true, { atras: backUrl, ...report.atrasTrasSerie });

  // --- Terminar ------------------------------------------------------------------------------------
  for (let guard = 0; guard < 80 && !/\/fin/.test(page.url()); guard++) {
    await page.waitForTimeout(300);
    if (/\/fin/.test(page.url())) break;
    const doneBtn = page.getByRole("button", { name: "Serie hecha", exact: true });
    const empezar = page.getByRole("button", { name: "Empezar", exact: true });
    if ((await doneBtn.count()) === 0 && (await empezar.count()) === 0) {
      await page.waitForURL(/\/fin/, { timeout: 15000 }).catch(() => {});
      continue;
    }
    await doSet().catch(() => {});
  }
  await urlIs(/\/sesion\/[0-9a-f-]{36}\/fin$/, 30000);
  await page.waitForLoadState("networkidle");
  const finShot = await snap("fin");
  check(page.url().includes(`/sesion/${sid}/fin`), "alta", `El fin es de otra sesión: ${page.url().replace(base, "")}`, finShot);
  const ended = await sessions();
  const allSets = await setRows();
  const hechas = allSets.filter((s) => s.status === "hecha");
  report.bd = { sesiones: ended.length, cerradas: ended.filter((s) => s.ended_at).length, series: hechas.length, tocadas: report.series.tocadas };
  check(ended.length === 1 && !!ended[0].ended_at, "critica", `Al terminar: ${ended.length} sesiones, cerradas ${ended.filter((s) => s.ended_at).length}`);
  check(hechas.length === report.series.tocadas, "alta", `Series en la base de datos (${hechas.length}) ≠ series tocadas en la UI (${report.series.tocadas})`, finShot);
  check(hechas.every((s) => s.session_id === sid), "critica", "Hay series en otra sesión");
  const dupIdx = new Set();
  for (const s of hechas) {
    const k = `${s.exercise_id}:${s.set_index}`;
    check(!dupIdx.has(k), "alta", `Serie duplicada ${k}`);
    dupIdx.add(k);
  }
  const finText = (await page.locator(".wz-heroes").first().textContent().catch(() => "")) ?? "";
  report.finCifras = finText.replace(/\s+/g, " ").trim();
  check(finText.includes(String(hechas.length)), "media", `El fin muestra «${report.finCifras}» y hay ${hechas.length} series hechas`, finShot);
  step("terminar", true, report.bd);

  // --- Recargar /fin y volver atrás no duplica nada -------------------------------------------------
  const endedAt = ended[0].ended_at;
  const states0 = JSON.stringify(must(await admin.from("exercise_state").select("exercise_id, working_weight_kg").eq("user_id", userId).order("exercise_id"), "estado"));
  for (let i = 0; i < 2; i++) {
    await page.reload();
    await page.waitForLoadState("networkidle");
  }
  const reloadFin = await snap("fin-recargado");
  await page.goBack();
  await page.waitForLoadState("networkidle");
  const backFin = page.url().replace(base, "");
  await page.waitForTimeout(1500);
  const runnerVisible = (await page.getByRole("button", { name: /^(Serie hecha|Empezar)$/ }).count()) > 0;
  const backFinShot = await snap("fin-atras");
  report.atrasDesdeFin = { url: page.url().replace(base, ""), sesionVisible: runnerVisible, finVisible: (await page.getByText("Sesión completada").count()) > 0 };
  check(!runnerVisible, "media", `Atrás desde /fin vuelve a mostrar la sesión ya cerrada (${report.atrasDesdeFin.url})`, backFinShot);
  const after = await sessions();
  const afterSets = (await setRows()).filter((s) => s.status === "hecha");
  const states1 = JSON.stringify(must(await admin.from("exercise_state").select("exercise_id, working_weight_kg").eq("user_id", userId).order("exercise_id"), "estado"));
  check(after.length === 1, "critica", `Tras recargar /fin hay ${after.length} sesiones`, reloadFin);
  check(after[0]?.ended_at === endedAt, "alta", "Recargar /fin cambia ended_at", reloadFin);
  check(afterSets.length === hechas.length, "critica", `Recargar /fin cambia las series: ${hechas.length} → ${afterSets.length}`, reloadFin);
  check(states0 === states1, "alta", "Recargar /fin cambia exercise_state", reloadFin);
  // Hoy ya apunta al día siguiente del plan.
  await page.goto(`${base}/hoy`);
  await page.waitForLoadState("networkidle");
  const nextShot = await snap("hoy-despues");
  const kicker = (await page.getByText(/^Día \d de \d$/).first().textContent().catch(() => "")) ?? "";
  check(/Día 2 de 2/.test(kicker), "media", `Tras terminar, Hoy dice «${kicker}» (se esperaba el día 2)`, nextShot);
  check((await page.getByRole("button", { name: "Seguir con la sesión" }).count()) === 0, "alta", "Tras terminar, Hoy aún ofrece «Seguir con la sesión»", nextShot);
  step("fin_idempotente", true, { atras: backFin });
} catch (error) {
  step("error", false, { error: String(error).slice(0, 400), url: page?.url() });
  const f = await snap("parada").catch(() => null);
  finding("alta", `Se paró en ${page?.url().replace(base, "")}: ${String(error).slice(0, 300)}`, f ?? undefined);
} finally {
  await browser.close();
  report.ok = report.findings.every((f) => f.severity === "info");
  fs.writeFileSync(path.join(outDir, "informe.json"), JSON.stringify(report, null, 2));
  if (!process.env.E2E_KEEP) await admin.auth.admin.deleteUser(userId);
  console.log(JSON.stringify({ script: "reanudar", ok: report.ok, outDir, steps: report.steps.map((s) => `${s.ok ? "ok" : "KO"} ${s.name}`), findings: report.findings, bd: report.bd, consoleErrors: report.consoleErrors }, null, 1));
}
