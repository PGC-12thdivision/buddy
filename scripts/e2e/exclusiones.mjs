// Exclusiones visibles (dictamen del debate de etiquetas, 20/11/2026).
// Uso: node scripts/e2e/exclusiones.mjs [baseUrl]
// - Crea un usuario confirmado con consentimiento y cribado superado, y genera su plan por /api/plan.
// - Simula un plan guardado antes de la migración del 21/11: pone «Remo con mancuerna» en un hueco de
//   remo y marca la muñeca. Al abrir el plan, la app lo repara sola (guardarraíl 6).
// - Plan: bloque «Ver qué hemos quitado» con la zona. Ajustes: marcar la zona lumbar lista los cambios.
// - Distintivo gris «Trabaja un poco: zona lumbar» bajo el remo sentado en polea.
// Lee las claves de .env.local y nunca las imprime. Solo staging.
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
const outDir = path.join(process.env.E2E_OUT ?? "e2e-out", `exclusiones-${ts}`);
fs.mkdirSync(outDir, { recursive: true });
const report = { script: "exclusiones", ts, steps: [], findings: [], consoleErrors: [] };
const step = (name, ok, extra = {}) => report.steps.push({ name, ok, ...extra });
const finding = (severity, text) => report.findings.push({ severity, text });
const check = (name, ok, text, extra = {}) => {
  step(name, ok, extra);
  if (!ok) finding("alta", text);
};

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
const must = (res, what) => {
  if (res.error) throw new Error(`${what}: ${res.error.code ?? res.error.message}`);
  return res.data;
};
const email = `e2e-exclusiones-${ts}@buddy.test`;
const password = `Prueba-${Math.random().toString(36).slice(2)}-X9`;

const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
if (!created.data.user) throw new Error(`no se pudo crear el usuario: ${created.error?.code}`);
const userId = created.data.user.id;
const equipment = must(await admin.from("equipment_types").select("id"), "equipo").map((e) => e.id);
must(await admin.from("onboarding_answers").insert({ user_id: userId, focus: "equilibrado", experience: "6_meses_2_anos", days_per_week: 3, minutes_per_session: 45, sports: [] }), "respuestas");
must(await admin.from("gym_profiles").insert({ user_id: userId, preset: "completo", equipment_type_ids: equipment }), "gimnasio");
must(await admin.from("consents").insert({ user_id: userId, version: "salud-2026-11-v1" }), "consentimiento");
must(await admin.from("health_profile").insert({ user_id: userId, limitations: [], screening_version: "cribado-2026-11-v1", screening_passed_at: new Date().toISOString() }), "salud");

// Huecos del plan activo.
const planSlots = async () => {
  const plan = must(await admin.from("plans").select("id").eq("user_id", userId).eq("is_active", true).single(), "plan");
  const sessions = must(await admin.from("plan_sessions").select("id").eq("plan_id", plan.id), "sesiones").map((s) => s.id);
  return must(await admin.from("plan_slots").select("id, exercise_id, region").in("plan_session_id", sessions), "huecos");
};

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 360, height: 740 } });
page.on("console", (m) => m.type() === "error" && report.consoleErrors.push(m.text().slice(0, 200)));
let shot = 0;
const snap = (name) => page.screenshot({ path: path.join(outDir, `${String(++shot).padStart(2, "0")}-${name}.png`), fullPage: true });
const planText = async () => {
  await page.goto(`${base}/plan`);
  await page.locator("ol").first().waitFor({ timeout: 30000 });
  return page.locator("main").innerText();
};

try {
  await page.goto(`${base}/entrar`);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Contraseña").fill(password);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/entrar"), { timeout: 30000 });
  const plan = await page.evaluate(async () => {
    const r = await fetch("/api/plan", { method: "POST" });
    return { http: r.status, ...(await r.json()) };
  });
  if (plan.status !== "ok") throw new Error(`plan: ${plan.status}`);
  step("plan", true);

  // 1. Plan antiguo con un ejercicio que ahora excluye la muñeca: se repara al abrir la app.
  const rows = (await planSlots()).filter((s) => s.region === "traccion_superior_horizontal" && s.exercise_id);
  if (rows.length === 0) throw new Error("el plan no tiene hueco de remo");
  must(await admin.from("plan_slots").update({ exercise_id: "remo_mancuerna" }).eq("id", rows[0].id), "forzar remo");
  must(await admin.from("health_profile").update({ limitations: ["muneca"] }).eq("user_id", userId), "muñeca");
  const healed = await planText();
  await snap("plan-reparado");
  const still = (await planSlots()).some((s) => s.exercise_id === "remo_mancuerna");
  check("reparado", !still, "El plan guardado sigue teniendo «Remo con mancuerna» con la muñeca marcada");
  // La misma petición que repara tiene que pintar el plan nuevo (no el memorizado).
  const listed = (await page.locator("ol").allInnerTexts()).join("\n").split("\n").map((l) => l.trim());
  check("pantalla_reparada", !listed.includes("Remo con mancuerna"), "La pantalla del plan aún muestra «Remo con mancuerna» tras repararlo");
  const details = page.locator("details[data-exclusiones]");
  check("bloque_visible", (await details.count()) === 1, "Falta el bloque «Ver qué hemos quitado»");
  await details.locator("summary").click();
  const block = await details.innerText();
  await snap("plan-bloque-abierto");
  check("bloque_muneca", block.includes("Remo con mancuerna") && block.includes("la muñeca"), `El bloque no explica el remo con mancuerna: ${block.slice(0, 300)}`);
  check("bloque_pie", block.includes("No es consejo médico"), "Falta «No es consejo médico» en el bloque");
  for (const banned of ["seguro", "sin riesgo", "protege", "lesión", "encaja con", "no carga esa"]) {
    if (`${healed} ${block}`.toLowerCase().includes(banned)) finding("media", `Frase prohibida en el plan: «${banned}»`);
  }

  // 2. Ajustes: marcar la zona lumbar lista los cambios uno a uno.
  await page.goto(`${base}/ajustes/limitaciones`);
  await page.getByRole("button", { name: "Espalda baja" }).click();
  await page.getByRole("button", { name: "Guardar" }).click();
  const note = page.locator('[role="status"]', { hasText: "Guardado." });
  await note.waitFor({ timeout: 30000 });
  const noteText = await note.innerText();
  await snap("ajustes-cambios");
  check("ajustes_lista", noteText.includes("→") && noteText.includes("(carga"), `El aviso no lista los cambios: ${noteText.slice(0, 300)}`);

  // 3. Distintivo gris: el remo sentado en polea trabaja un poco la zona lumbar y no se quita.
  const remo = (await planSlots()).find((s) => s.region === "traccion_superior_horizontal" && s.exercise_id);
  if (remo) must(await admin.from("plan_slots").update({ exercise_id: "remo_sentado_polea" }).eq("id", remo.id), "forzar remo polea");
  const withBadge = await planText();
  await snap("plan-distintivo");
  check("distintivo", withBadge.includes("Trabaja un poco: zona lumbar"), "Falta el distintivo «Trabaja un poco: zona lumbar»");
  const stillPolea = (await planSlots()).some((s) => s.exercise_id === "remo_sentado_polea");
  check("leve_no_excluye", stillPolea, "El remo sentado en polea se ha quitado aunque la zona lumbar solo es leve");
} catch (error) {
  step("error", false, { error: String(error).slice(0, 300), url: page.url() });
  finding("alta", `Se paró en ${page.url().replace(base, "")}: ${String(error).slice(0, 200)}`);
  await snap("parada").catch(() => {});
} finally {
  await browser.close();
  await admin.auth.admin.deleteUser(userId).catch(() => {});
  fs.writeFileSync(path.join(outDir, "informe.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ script: "exclusiones", ok: report.findings.length === 0, findings: report.findings, steps: report.steps, consoleErrors: report.consoleErrors }));
}
