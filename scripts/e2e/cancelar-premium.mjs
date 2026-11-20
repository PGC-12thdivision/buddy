// Cancelar premium desde el portal deja la baja programada y Ajustes lo dice (20/11/2026).
// Uso: node scripts/e2e/cancelar-premium.mjs [baseUrl]
// - Crea un usuario confirmado con consentimiento y cribado superado, y genera su plan por /api/plan.
// - En Stripe (modo test) le crea un cliente y una suscripción, y deja account_status como lo deja
//   el webhook (cliente y estado). El portal de Stripe cancela "al final del periodo".
// - Ajustes antes de cancelar: "Premium". Tras programar la baja en Stripe: "Premium hasta el …".
// Lee las claves de .env.local y nunca las imprime. Solo staging y solo claves de test de Stripe.
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";
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
if (!env.STRIPE_SECRET_KEY?.startsWith("sk_test_")) throw new Error("Solo con la clave de test de Stripe");

const corePath =
  process.env.PLAYWRIGHT_CORE ??
  path.join(process.env.APPDATA, "npm/node_modules/@playwright/cli/node_modules/playwright-core/index.mjs");
const { chromium } = await import(pathToFileURL(corePath).href);

const base = process.argv[2] ?? "http://localhost:3000";
const ts = Date.now();
const outDir = path.join(process.env.E2E_OUT ?? "e2e-out", `cancelar-premium-${ts}`);
fs.mkdirSync(outDir, { recursive: true });
const report = { script: "cancelar-premium", ts, steps: [], findings: [], consoleErrors: [] };
const step = (name, ok, extra = {}) => report.steps.push({ name, ok, ...extra });
const finding = (severity, text) => report.findings.push({ severity, text });

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
const must = (res, what) => {
  if (res.error) throw new Error(`${what}: ${res.error.code ?? res.error.message}`);
  return res.data;
};
const stripe = new Stripe(env.STRIPE_SECRET_KEY);
const email = `e2e-cancelar-${ts}@buddy.test`;
const password = `Prueba-${Math.random().toString(36).slice(2)}-X9`;

const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
if (!created.data.user) throw new Error(`no se pudo crear el usuario: ${created.error?.code}`);
const userId = created.data.user.id;
const equipment = must(await admin.from("equipment_types").select("id"), "equipo").map((e) => e.id);
must(await admin.from("onboarding_answers").insert({ user_id: userId, focus: "equilibrado", experience: "6_meses_2_anos", days_per_week: 2, minutes_per_session: 30, sports: [] }), "respuestas");
must(await admin.from("gym_profiles").insert({ user_id: userId, preset: "completo", equipment_type_ids: equipment }), "gimnasio");
must(await admin.from("consents").insert({ user_id: userId, version: "salud-2026-11-v1" }), "consentimiento");
must(await admin.from("health_profile").insert({ user_id: userId, limitations: [], screening_version: "cribado-2026-11-v1", screening_passed_at: new Date().toISOString() }), "salud");

let customerId = null;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 360, height: 640 } });
page.on("console", (m) => m.type() === "error" && report.consoleErrors.push(m.text().slice(0, 200)));
let shot = 0;
const snap = (name) => page.screenshot({ path: path.join(outDir, `${String(++shot).padStart(2, "0")}-${name}.png`), fullPage: true });
const estado = async () => {
  await page.goto(`${base}/ajustes`);
  const row = page.locator(".wz-rule-row", { hasText: "Estado" });
  await row.waitFor({ timeout: 20000 });
  return (await row.locator(".wz-rule-value").innerText()).trim();
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

  const customer = await stripe.customers.create({ metadata: { buddy_user_id: userId, e2e: "cancelar-premium" } });
  customerId = customer.id;
  const sub = await stripe.subscriptions.create({
    customer: customer.id,
    items: [{ price: env.STRIPE_PRICE_ID }],
    trial_period_days: 7,
    trial_settings: { end_behavior: { missing_payment_method: "cancel" } },
  });
  must(await admin.from("account_status").update({ stripe_customer_id: customer.id, subscription_status: sub.status }).eq("user_id", userId), "estado");
  step("suscripcion_creada", sub.status === "trialing", { status: sub.status });

  const antes = await estado();
  await snap("ajustes-premium");
  if (antes !== "Premium") finding("alta", `Antes de cancelar, Ajustes dice "${antes}" en vez de "Premium"`);
  if ((await page.getByRole("button", { name: "Gestionar" }).count()) !== 1) finding("media", 'Falta el botón "Gestionar"');
  step("antes", antes === "Premium", { estado: antes });

  // Lo mismo que hace el portal con la cancelación "al final del periodo".
  const cancelled = await stripe.subscriptions.update(sub.id, { cancel_at_period_end: true });
  const end = new Date((cancelled.cancel_at ?? cancelled.items.data[0].current_period_end) * 1000);
  const expected = `Premium hasta el ${new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short", timeZone: "Europe/Madrid" }).format(end)}`;
  const despues = await estado();
  await snap("ajustes-premium-hasta");
  if (despues !== expected) finding("alta", `Tras cancelar, Ajustes dice "${despues}" en vez de "${expected}"`);
  step("despues", despues === expected, { estado: despues });
} catch (error) {
  step("error", false, { error: String(error).slice(0, 300), url: page.url() });
  finding("alta", `Se paró en ${page.url().replace(base, "")}: ${String(error).slice(0, 200)}`);
  await snap("parada").catch(() => {});
} finally {
  await browser.close();
  await admin.auth.admin.deleteUser(userId).catch(() => {});
  if (customerId) await stripe.customers.del(customerId).catch(() => {});
  fs.writeFileSync(path.join(outDir, "informe.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ script: "cancelar-premium", ok: report.findings.length === 0, findings: report.findings, steps: report.steps, consoleErrors: report.consoleErrors }));
}
