// Borrar la cuenta cancela la suscripción de Stripe (20/11/2026). Uso: node scripts/e2e/borrar-cuenta.mjs [baseUrl]
// - Crea un usuario confirmado con respuestas y gimnasio (sin consentimiento, como quien dice "No").
// - En Stripe (modo test) le crea un cliente y una suscripción en prueba, y guarda el cliente en
//   account_status como haría el checkout.
// - En el navegador, a 360 px: entrar, "No quiero dar estos datos", "Borrar mi cuenta" y confirmar.
// - Comprueba: el usuario ya no existe en Auth y la suscripción de Stripe está cancelada.
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
const outDir = path.join(process.env.E2E_OUT ?? "e2e-out", `borrar-cuenta-${ts}`);
fs.mkdirSync(outDir, { recursive: true });
const report = { script: "borrar-cuenta", ts, steps: [], findings: [], consoleErrors: [] };
const step = (name, ok, extra = {}) => report.steps.push({ name, ok, ...extra });
const finding = (severity, text) => report.findings.push({ severity, text });

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
const stripe = new Stripe(env.STRIPE_SECRET_KEY);
const email = `e2e-borrar-${ts}@buddy.test`;
const password = `Prueba-${Math.random().toString(36).slice(2)}-X9`;

const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
if (!created.data.user) throw new Error(`no se pudo crear el usuario: ${created.error?.code}`);
const userId = created.data.user.id;
const equipment = (await admin.from("equipment_types").select("id")).data.map((e) => e.id);
await admin.from("onboarding_answers").insert({ user_id: userId, focus: "equilibrado", experience: "6_meses_2_anos", days_per_week: 3, minutes_per_session: 45, sports: [] });
await admin.from("gym_profiles").insert({ user_id: userId, preset: "completo", equipment_type_ids: equipment });

let customerId = null;
let deleted = false;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 360, height: 640 } });
page.on("console", (m) => m.type() === "error" && report.consoleErrors.push(m.text().slice(0, 200)));
let shot = 0;
const snap = (name) => page.screenshot({ path: path.join(outDir, `${String(++shot).padStart(2, "0")}-${name}.png`) });

try {
  const customer = await stripe.customers.create({ metadata: { buddy_user_id: userId, e2e: "borrar-cuenta" } });
  customerId = customer.id;
  const sub = await stripe.subscriptions.create({
    customer: customer.id,
    items: [{ price: env.STRIPE_PRICE_ID }],
    trial_period_days: 7,
    trial_settings: { end_behavior: { missing_payment_method: "cancel" } },
  });
  const saved = await admin.from("account_status").update({ stripe_customer_id: customer.id }).eq("user_id", userId).select("user_id");
  if (saved.error || saved.data.length !== 1) throw new Error("no se pudo guardar el cliente en account_status");
  step("suscripcion_creada", sub.status === "trialing", { status: sub.status });

  await page.goto(`${base}/entrar`);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Contraseña").fill(password);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/entrar"), { timeout: 30000 });
  step("entrar", true, { url: page.url().replace(base, "") });

  await page.goto(`${base}/sin-datos-de-salud`);
  await snap("sin-datos");
  await page.getByRole("button", { name: "Borrar mi cuenta" }).click();
  await page.getByRole("dialog").waitFor({ timeout: 5000 });
  await snap("confirmar");
  await page.getByRole("dialog").getByRole("button", { name: /borrar/i }).first().click();
  await page.waitForURL((u) => u.pathname === "/", { timeout: 30000 });
  await snap("vuelta-inicio");
  step("borrar_ui", true);

  const user = await admin.auth.admin.getUserById(userId);
  deleted = !user.data?.user;
  if (!deleted) finding("alta", "El usuario sigue existiendo en Auth");
  step("usuario_borrado", deleted);

  const after = await stripe.subscriptions.retrieve(sub.id);
  if (after.status !== "canceled") finding("alta", `La suscripción sigue en estado ${after.status}`);
  step("suscripcion_cancelada", after.status === "canceled", { status: after.status });
} catch (error) {
  step("error", false, { error: String(error).slice(0, 300), url: page.url() });
  finding("alta", `Se paró en ${page.url().replace(base, "")}: ${String(error).slice(0, 200)}`);
  await snap("parada").catch(() => {});
} finally {
  await browser.close();
  if (!deleted) await admin.auth.admin.deleteUser(userId).catch(() => {});
  if (customerId) await stripe.customers.del(customerId).catch(() => {});
  fs.writeFileSync(path.join(outDir, "informe.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ script: "borrar-cuenta", ok: report.findings.length === 0, findings: report.findings, steps: report.steps }));
}
