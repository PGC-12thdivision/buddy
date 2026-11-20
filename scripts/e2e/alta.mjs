// Alta de verdad por la UI en staging (QA del 20/11/2026). Uso: node scripts/e2e/alta.mjs [baseUrl]
// A diferencia de ciclo.mjs, no crea nada por admin antes de tiempo: recorre a 360 px la bienvenida, el
// wizard (foco, experiencia, semana, deportes, gimnasio), /registro con la casilla +18 y
// /revisa-tu-correo. El correo se confirma sin buzón con admin.auth.admin.generateLink y la ruta real
// /auth/confirm (token_hash + type). Después: consentimiento (casilla sin premarcar), limitaciones,
// cribado con dos variantes (una respuesta de riesgo bloquea la generación; la articular sin zona
// obliga a marcarla), resumen, /generando con IA real, /plan y /hoy.
// Comprueba en la base de datos que respuestas, gimnasio, consentimiento, salud y plan activo son lo
// que se eligió en la UI. Capturas a 360 px e informe JSON con hallazgos por severidad.
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
const outDir = path.join(process.env.E2E_OUT ?? "e2e-out", `alta-${ts}`);
fs.mkdirSync(outDir, { recursive: true });

const report = { script: "alta", ts, steps: [], findings: [], consoleErrors: [], confirmacion: null, bd: {} };
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
// Supabase Auth rechaza el dominio .test en signUp; E2E_ALTA_DOMAIN permite probar el alta real con
// otro dominio (ojo: Supabase enviará el correo de confirmación de verdad).
const email = `e2e-alta-${ts}@${process.env.E2E_ALTA_DOMAIN ?? "buddy.test"}`;
const password = `Prueba-${Math.random().toString(36).slice(2)}-X9`;
let userId = null;

// Lo que se elige en la UI (y lo que se espera ver después en la base de datos).
const choice = {
  focus: "musculo",
  focusLabel: /^Más músculo/,
  experience: "mas_2_anos",
  experienceLabel: /^Más de 2 años/,
  days: 4,
  minutes: 60,
  preset: "basico",
  presetLabel: /^Básico/,
  removeEquipment: { id: "prensa_piernas", zone: "Pierna", name: /Prensa de piernas/ },
  limitation: { id: "rodilla", label: "Rodilla" },
};
const BASIC = ["prensa_piernas", "extension_cuadriceps", "curl_femoral_sentado", "jalon", "remo_polea", "polea_doble", "press_pecho_maquina", "press_hombro_maquina", "mancuernas", "banco", "esterilla", "cinta", "bici_estatica", "eliptica"];

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 360, height: 640 } });
const page = await context.newPage();
page.on("console", (m) => m.type() === "error" && report.consoleErrors.push(`${page.url().replace(base, "")}: ${m.text().slice(0, 200)}`));
page.on("pageerror", (e) => report.consoleErrors.push(`pageerror ${page.url().replace(base, "")}: ${String(e).slice(0, 200)}`));
let shot = 0;
const snap = async (name, fullPage = false) => {
  const file = path.join(outDir, `${String(++shot).padStart(2, "0")}-${name}.png`);
  await page.screenshot({ path: file, fullPage });
  return file;
};
const click = async (role, name, opts = {}) => {
  const el = page.getByRole(role, { name, exact: opts.exact ?? false }).first();
  await el.waitFor({ state: "visible", timeout: opts.timeout ?? 15000 });
  await el.click();
};
const urlIs = (re, timeout = 20000) => page.waitForURL(re, { timeout });
const cta = () => page.locator(".wz-cta").last();
const radioIn = (group, name) => page.getByRole("radiogroup", { name: group }).getByRole("radio", { name, exact: typeof name === "string" });
const screeningGroups = () => page.getByRole("radiogroup");

// Contesta el cribado: `yes` es la lista de etiquetas (regex) que van a "Sí"; el resto, "No".
async function answerScreening(yes) {
  const groups = screeningGroups();
  await groups.first().waitFor();
  const count = await groups.count();
  for (let i = 0; i < count; i++) {
    const g = groups.nth(i);
    const label = (await g.getAttribute("aria-label")) ?? "";
    const isYes = yes.some((re) => re.test(label));
    await g.getByRole("radio", { name: isYes ? "Sí" : "No", exact: true }).click();
  }
}

try {
  const catalogEquipment = must(await admin.from("equipment_types").select("id, name, zone"), "equipo");
  const activities = must(await admin.from("activity_types").select("id, name").order("name"), "actividades");
  const sports = activities.slice(0, 2);
  report.eleccion = { ...choice, sports: sports.map((s) => s.id) };

  // --- Bienvenida -----------------------------------------------------------------------------
  await page.goto(`${base}/`);
  await page.getByRole("link", { name: "Empezar" }).waitFor();
  const landingShot = await snap("bienvenida");
  check((await page.getByText(/no es consejo médico/i).count()) > 0, "alta", "La bienvenida no muestra el aviso de que no es consejo médico", landingShot);
  await click("link", "Empezar", { exact: true });
  await urlIs(/\/foco/);
  step("bienvenida", true);

  // --- Foco (Equilibrado preseleccionado) -----------------------------------------------------
  await radioIn("Tu foco", choice.focusLabel).waitFor();
  const pre = await radioIn("Tu foco", /^Equilibrado/).getAttribute("aria-checked");
  check(pre === "true", "baja", "Foco: «Equilibrado» no viene preseleccionado (PRD §5)");
  await radioIn("Tu foco", choice.focusLabel).click();
  await snap("foco");
  await cta().click();
  await urlIs(/\/experiencia/);
  step("foco", true);

  // --- Experiencia (nada preseleccionado, Siguiente desactivado) ------------------------------
  await radioIn("Tu experiencia entrenando", choice.experienceLabel).waitFor();
  check(await cta().isDisabled(), "media", "Experiencia: «Siguiente» activo sin elegir nada");
  await radioIn("Tu experiencia entrenando", choice.experienceLabel).click();
  await snap("experiencia");
  await cta().click();
  await urlIs(/\/semana/);
  step("experiencia", true);

  // --- Semana -----------------------------------------------------------------------------------
  await radioIn("Días por semana", String(choice.days)).click();
  await radioIn("Minutos por sesión", String(choice.minutes)).click();
  const hint = await page.getByText(/Te montamos/).first().textContent();
  check(/torso y pierna/.test(hint ?? ""), "baja", `Semana: con ${choice.days} días el aviso de plantilla dice «${hint}»`);
  await snap("semana");
  await cta().click();
  await urlIs(/\/deportes/);
  step("semana", true);

  // --- Deportes -------------------------------------------------------------------------------
  const ctaText0 = (await cta().textContent())?.trim();
  check(ctaText0 === "Saltar", "baja", `Deportes: sin selección el botón dice «${ctaText0}» en vez de «Saltar»`);
  for (const s of sports) await page.getByRole("group", { name: "Deportes que haces" }).getByRole("button", { name: s.name, exact: true }).click();
  await snap("deportes");
  await cta().click();
  await urlIs(/\/gimnasio/);
  step("deportes", true, { elegidos: sports.map((s) => s.id) });

  // --- Gimnasio -------------------------------------------------------------------------------
  await radioIn("Tipo de gimnasio", choice.presetLabel).click();
  await page.locator("summary", { hasText: choice.removeEquipment.zone }).first().click();
  const chip = page.getByRole("button", { name: choice.removeEquipment.name }).first();
  await chip.waitFor({ timeout: 10000 });
  if ((await chip.getAttribute("aria-pressed")) === "true") await chip.click();
  const counter = (await page.getByText(/tipos de equipo marcados/).first().textContent()) ?? "";
  await snap("gimnasio", true);
  const catalogIds = catalogEquipment.map((e) => e.id);
  const expectedEquipment = BASIC.filter((id) => catalogIds.includes(id) && id !== choice.removeEquipment.id).sort();
  check(counter.startsWith(`${expectedEquipment.length} de ${catalogIds.length}`), "media", `Gimnasio: el contador dice «${counter.trim()}» y se esperaban ${expectedEquipment.length} de ${catalogIds.length}`);
  await cta().click();
  await urlIs(/\/registro/);
  step("gimnasio", true, { contador: counter.trim() });

  // --- Registro -------------------------------------------------------------------------------
  const adult = page.locator("#adult");
  await adult.waitFor();
  check(!(await adult.isChecked()), "alta", "Registro: la casilla de mayor de 18 viene marcada");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Contraseña").fill(password);
  // Sin +18: el servidor tiene que rechazarlo con su mensaje.
  await click("button", "Crear mi cuenta", { exact: true });
  const adultError = await page.getByText("Para usar BUDDY tienes que tener 18 años o más.").waitFor({ timeout: 15000 }).then(() => true).catch(() => false);
  const noAdultShot = await snap("registro-sin-18");
  check(adultError, "alta", "Registro: sin marcar +18 no aparece el error de edad", noAdultShot);
  check(page.url().includes("/registro"), "critica", "Registro: sin marcar +18 se creó la cuenta igualmente", noAdultShot);
  const early = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  check(!(early.data?.users ?? []).some((u) => u.email === email), "critica", "Registro: sin +18 la cuenta existe en auth.users");
  await adult.check();
  await snap("registro");
  // Lo que la UI va a mandar al registro: el borrador del dispositivo (sin datos de salud).
  const draft = await page.evaluate(() => JSON.parse(window.localStorage.getItem("buddy.wizard.v1") ?? "null"));
  report.borrador = draft?.answers ?? null;
  check(!!draft && !/limitation|screening|cribado/i.test(JSON.stringify(draft)), "critica", "El borrador del dispositivo lleva datos de salud");
  await click("button", "Crear mi cuenta", { exact: true });
  const registered = await urlIs(/\/revisa-tu-correo/, 30000).then(() => true).catch(() => false);
  if (registered) {
    report.registro = "UI (signUp real de Supabase)";
    step("registro", true);
  } else {
    // Supabase Auth puede rechazar el alta por motivos ajenos al código: el dominio .test no es un
    // email válido para Supabase y el SMTP por defecto tiene un tope de envíos por hora. Plan B, lo
    // más fiel posible: la misma escritura que hace registrarse() (usuario sin confirmar, respuestas
    // y gimnasio tal como los dejó la UI en el borrador), y se sigue por la UI real.
    const shotFile = await snap("registro-rechazado");
    const fieldError = await page.locator(".wz-error, [role=alert]:not(#__next-route-announcer__)").allTextContents();
    const why = fieldError.join(" | ").trim() || "sin aviso";
    report.registro = `plan B: Supabase rechazó signUp en la UI («${why}»)`;
    if (/demasiados intentos/i.test(why)) {
      finding("alta", `Registro bloqueado por el tope de emails de Supabase Auth: la UI muestra «${why}». Con el SMTP por defecto, pocas altas por hora; afecta a cualquier usuario nuevo (configuración, no código).`, shotFile);
    } else if (/email válido/i.test(why) && email.endsWith(".test")) {
      finding("info", `Supabase Auth rechaza el dominio .test como email no válido («${why}»): el alta por UI no puede completarse con ${email.replace(/\d+/, "<ts>")}. Se usa el plan B.`, shotFile);
    } else {
      finding("alta", `Registro: la UI no llegó a /revisa-tu-correo («${why}»)`, shotFile);
    }
    step("registro", false, { planB: true, aviso: why });
    if (!draft?.answers) throw new Error("sin borrador del wizard para el plan B");
    const a = draft.answers;
    const created = await admin.auth.admin.createUser({ email, password, email_confirm: false });
    if (!created.data.user) throw new Error(`plan B: no se pudo crear el usuario: ${created.error?.code}`);
    const uid = created.data.user.id;
    must(await admin.from("onboarding_answers").insert({ user_id: uid, focus: a.focus, experience: a.experience, days_per_week: a.daysPerWeek, minutes_per_session: a.minutesPerSession, sports: a.sports }), "plan B respuestas");
    must(await admin.from("gym_profiles").insert({ user_id: uid, preset: a.gymPreset, equipment_type_ids: a.equipmentTypeIds }), "plan B gimnasio");
    must(await admin.from("events").insert({ user_id: uid, name: "registro", step: "registro" }), "plan B evento");
    await page.evaluate((e) => window.sessionStorage.setItem("buddy.registro.email", e), email);
    await page.goto(`${base}/revisa-tu-correo`);
  }

  // --- Revisa tu correo ---------------------------------------------------------------------------
  await page.getByText(/Te hemos enviado un enlace/).waitFor();
  const masked = (await page.locator("main b").first().textContent()) ?? "";
  const mailShot = await snap("revisa-tu-correo");
  check(masked.trim() === `${email[0]}…@…`, "baja", `Revisa tu correo: el email enmascarado es «${masked}»`, mailShot);
  check(!(await page.content()).includes(email), "media", "Revisa tu correo: el email completo aparece en la página", mailShot);
  const resend = page.getByRole("button", { name: /Reenviar/ });
  check(await resend.isDisabled(), "baja", "Revisa tu correo: «Reenviar» activo antes de los 60 s");
  step("revisa_tu_correo", true);

  // El usuario existe, sin confirmar, y con las respuestas del wizard guardadas.
  const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const user = (list?.users ?? []).find((u) => u.email === email);
  if (!user) throw new Error("el registro no creó el usuario en auth.users");
  userId = user.id;
  report.userId = userId;
  check(!user.email_confirmed_at, "alta", "El email aparece confirmado sin abrir el enlace");

  const answersRow = must(await admin.from("onboarding_answers").select("*").eq("user_id", userId).maybeSingle(), "respuestas");
  const gymRow = must(await admin.from("gym_profiles").select("*").eq("user_id", userId).maybeSingle(), "gimnasio");
  report.bd.respuestas = answersRow;
  report.bd.gimnasio = gymRow && { preset: gymRow.preset, equipos: gymRow.equipment_type_ids.length };
  check(!!answersRow, "critica", "onboarding_answers no se guardó en el registro");
  if (answersRow) {
    check(answersRow.focus === choice.focus, "alta", `onboarding_answers.focus = ${answersRow.focus}, elegido ${choice.focus}`);
    check(answersRow.experience === choice.experience, "alta", `onboarding_answers.experience = ${answersRow.experience}, elegido ${choice.experience}`);
    check(answersRow.days_per_week === choice.days, "alta", `onboarding_answers.days_per_week = ${answersRow.days_per_week}, elegido ${choice.days}`);
    check(answersRow.minutes_per_session === choice.minutes, "alta", `onboarding_answers.minutes_per_session = ${answersRow.minutes_per_session}, elegido ${choice.minutes}`);
    const gotSports = [...answersRow.sports].sort().join(",");
    check(gotSports === sports.map((s) => s.id).sort().join(","), "alta", `onboarding_answers.sports = ${gotSports}`);
  }
  check(!!gymRow, "critica", "gym_profiles no se guardó en el registro");
  if (gymRow) {
    check(gymRow.preset === choice.preset, "alta", `gym_profiles.preset = ${gymRow.preset}, elegido ${choice.preset}`);
    const got = [...gymRow.equipment_type_ids].sort().join(",");
    check(got === expectedEquipment.join(","), "alta", `gym_profiles.equipment_type_ids no coincide con lo marcado: ${got}`);
  }
  const events = must(await admin.from("events").select("name, step").eq("user_id", userId), "eventos");
  report.bd.eventos = events.length;
  check(events.some((e) => e.name === "registro"), "baja", "events: falta el evento de registro");

  // Sin confirmar, entrar con la contraseña no deja pasar.
  const probe = await browser.newContext({ viewport: { width: 360, height: 640 } });
  const probePage = await probe.newPage();
  await probePage.goto(`${base}/entrar`);
  await probePage.getByLabel("Email").fill(email);
  await probePage.getByLabel("Contraseña").fill(password);
  await probePage.getByRole("button", { name: "Entrar", exact: true }).click();
  await probePage.waitForTimeout(3000);
  const probeFile = path.join(outDir, `${String(++shot).padStart(2, "0")}-entrar-sin-confirmar.png`);
  await probePage.screenshot({ path: probeFile });
  check(probePage.url().includes("/entrar"), "critica", `Se puede entrar sin confirmar el email (fue a ${probePage.url().replace(base, "")})`, probeFile);
  await probe.close();

  // --- Confirmar el correo sin buzón ------------------------------------------------------------
  // Plan A: generateLink(type "signup") devuelve el hashed_token del mismo enlace que manda Supabase;
  // se visita la ruta real /auth/confirm con token_hash y type=signup. Plan B: magiclink con type=email
  // (verifyOtp acepta "email" para ese hash y también confirma el correo).
  let link = await admin.auth.admin.generateLink({ type: "signup", email, password });
  let type = "signup";
  if (link.error || !link.data?.properties?.hashed_token) {
    report.confirmacion = { planA: `generateLink signup falló: ${link.error?.code ?? link.error?.status ?? "sin hashed_token"}` };
    link = await admin.auth.admin.generateLink({ type: "magiclink", email });
    type = "email";
    if (link.error || !link.data?.properties?.hashed_token) throw new Error(`generateLink magiclink falló: ${link.error?.code ?? "sin hashed_token"}`);
  }
  report.confirmacion = { ...(report.confirmacion ?? {}), usado: type === "signup" ? "generateLink signup + /auth/confirm?type=signup" : "generateLink magiclink + /auth/confirm?type=email" };
  const tokenHash = link.data.properties.hashed_token;
  await page.goto(`${base}/auth/confirm?token_hash=${encodeURIComponent(tokenHash)}&type=${type}&next=/consentimiento`);
  await urlIs(/\/consentimiento/, 20000).catch(async () => {
    const f = await snap("confirmar-fallo");
    throw new Error(`/auth/confirm no llevó a /consentimiento sino a ${page.url().replace(base, "")} (${f})`);
  });
  const confirmed = (await admin.auth.admin.getUserById(userId)).data?.user;
  check(!!confirmed?.email_confirmed_at, "critica", "Tras /auth/confirm el email no está confirmado");
  // El mismo enlace no vale dos veces.
  const reuse = await browser.newContext({ viewport: { width: 360, height: 640 } });
  const reusePage = await reuse.newPage();
  await reusePage.goto(`${base}/auth/confirm?token_hash=${encodeURIComponent(tokenHash)}&type=${type}`);
  await reusePage.waitForLoadState("networkidle");
  check(/\/entrar\?aviso=enlace/.test(reusePage.url()), "media", `Reusar el enlace de confirmación lleva a ${reusePage.url().replace(base, "")} en vez de /entrar?aviso=enlace`);
  await reuse.close();
  step("confirmar_email", true, { via: report.confirmacion.usado });

  // --- Consentimiento ---------------------------------------------------------------------------
  const consentBox = page.getByRole("checkbox");
  await consentBox.waitFor();
  const consentShot = await snap("consentimiento");
  check(!(await consentBox.isChecked()), "critica", "Consentimiento: la casilla viene premarcada (RGPD)", consentShot);
  check(await cta().isDisabled(), "critica", "Consentimiento: «Siguiente» activo sin marcar la casilla", consentShot);
  const before = must(await admin.from("consents").select("id").eq("user_id", userId), "consentimientos");
  check(before.length === 0, "critica", "Hay consentimiento guardado antes de marcar la casilla");
  // Antes del consentimiento no se puede saltar a limitaciones ni al cribado.
  await page.goto(`${base}/seguridad`);
  await page.waitForLoadState("networkidle");
  check(/\/consentimiento/.test(page.url()), "alta", `Sin consentimiento, /seguridad no redirige al consentimiento (${page.url().replace(base, "")})`);
  if (!/\/consentimiento/.test(page.url())) await page.goto(`${base}/consentimiento`);
  await page.getByRole("checkbox").check();
  await cta().click();
  await urlIs(/\/limitaciones/);
  const consents = must(await admin.from("consents").select("version, granted_at, withdrawn_at").eq("user_id", userId), "consentimientos");
  report.bd.consentimiento = consents;
  check(consents.length === 1 && consents[0].withdrawn_at === null && !!consents[0].version, "critica", `consents tras aceptar: ${JSON.stringify(consents)}`);
  step("consentimiento", true);

  // --- Limitaciones: Ninguna, para probar las variantes del cribado ---------------------------
  await click("button", "Ninguna", { exact: true });
  await snap("limitaciones-ninguna");
  await cta().click();
  await urlIs(/\/seguridad/);
  step("limitaciones_ninguna", true);

  // --- Variante 1: una respuesta de riesgo bloquea --------------------------------------------
  const seguridadVacia = await snap("seguridad-vacia");
  check(await cta().isDisabled(), "alta", "Cribado: «Siguiente» activo sin responder", seguridadVacia);
  const preMarked = await page.locator('[role=radiogroup] [role=radio][aria-checked="true"]').count();
  check(preMarked === 0, "alta", `Cribado: ${preMarked} respuestas vienen marcadas`, seguridadVacia);
  await answerScreening([/problema cardíaco/]);
  await snap("seguridad-riesgo", true);
  await cta().click();
  await page.getByRole("heading", { name: "Primero, un profesional" }).waitFor({ timeout: 15000 });
  const blockShot = await snap("seguridad-bloqueo");
  check(/\/seguridad$/.test(new URL(page.url()).pathname), "media", `El bloqueo cambió la URL a ${page.url().replace(base, "")}`, blockShot);
  const hpBlocked = must(await admin.from("health_profile").select("user_id").eq("user_id", userId), "salud");
  check(hpBlocked.length === 0, "critica", "Cribado con riesgo: se guardó health_profile", blockShot);
  // La generación queda bloqueada: ni la API ni las pantallas.
  const apiBlocked = await page.evaluate(async () => {
    const r = await fetch("/api/plan", { method: "POST" });
    return { http: r.status, body: await r.json().catch(() => null) };
  });
  check(apiBlocked.body?.status === "sin_permiso", "critica", `Cribado con riesgo: POST /api/plan responde ${JSON.stringify(apiBlocked)}`, blockShot);
  const plansBlocked = must(await admin.from("plans").select("id").eq("user_id", userId), "planes");
  check(plansBlocked.length === 0, "critica", "Cribado con riesgo: existe un plan");
  const aiBlocked = must(await admin.from("ai_calls").select("id").eq("user_id", userId), "ai_calls");
  check(aiBlocked.length === 0, "critica", "Cribado con riesgo: hubo llamada a la IA");
  // Abrir /generando o /resumen a mano tampoco genera (en otra pestaña, para no perder el estado del wizard).
  const sneak = await context.newPage();
  for (const p of ["generando", "resumen"]) {
    await sneak.goto(`${base}/${p}`);
    await sneak.waitForLoadState("networkidle");
    const f = path.join(outDir, `${String(++shot).padStart(2, "0")}-bloqueo-${p}-a-mano.png`);
    await sneak.screenshot({ path: f });
    check(!new URL(sneak.url()).pathname.startsWith(`/${p}`), "critica", `Cribado con riesgo: /${p} se abre (${sneak.url().replace(base, "")})`, f);
  }
  await sneak.close();
  check(must(await admin.from("plans").select("id").eq("user_id", userId), "planes").length === 0, "critica", "Cribado con riesgo: se generó un plan al abrir /generando");
  // Sin datos de salud en eventos: el resultado del cribado no se registra.
  const evs = must(await admin.from("events").select("name, step").eq("user_id", userId), "eventos");
  check(!evs.some((e) => /bloque|riesgo|cribado_/.test(`${e.name} ${e.step}`)), "critica", `events contiene el resultado del cribado: ${JSON.stringify(evs)}`);
  step("variante_riesgo_bloquea", true, { api: apiBlocked.body?.status });

  // --- Variante 2: la articular sin zona obliga a marcarla -----------------------------------
  await click("button", "Revisar mis respuestas", { exact: true });
  await screeningGroups().first().waitFor();
  await answerScreening([/huesos, articulaciones/]);
  await page.getByText(/Marca la zona en Limitaciones/).waitFor({ timeout: 5000 });
  const zoneShot = await snap("seguridad-articular-sin-zona", true);
  check(await cta().isDisabled(), "critica", "Cribado: articular «Sí» sin zona deja pulsar «Siguiente»", zoneShot);
  // La acción del servidor también lo exige aunque se salte la UI.
  check(must(await admin.from("health_profile").select("user_id").eq("user_id", userId), "salud").length === 0, "critica", "Articular sin zona: se guardó health_profile");
  await click("link", "Ir a limitaciones", { exact: true });
  await urlIs(/\/limitaciones/);
  const limShot = await snap("limitaciones-obliga-zona");
  // Con la articular en «Sí», «Ninguna» no basta.
  const noneStillChosen = (await page.getByRole("button", { name: "Ninguna", exact: true }).getAttribute("aria-pressed")) === "true";
  if (noneStillChosen) check(await cta().isDisabled(), "alta", "Limitaciones: con la articular en «Sí» y «Ninguna», «Siguiente» sigue activo", limShot);
  await click("button", choice.limitation.label, { exact: true });
  await snap("limitaciones-rodilla");
  await cta().click();
  await urlIs(/\/seguridad/);
  // Las respuestas del cribado se conservan en memoria: articular sigue en «Sí».
  const kept = await page.getByRole("radiogroup", { name: /huesos, articulaciones/ }).getByRole("radio", { name: "Sí", exact: true }).getAttribute("aria-checked");
  if (kept !== "true") {
    finding("baja", "Cribado: al volver de Limitaciones se pierden las respuestas");
    await answerScreening([/huesos, articulaciones/]);
  }
  await snap("seguridad-con-zona", true);
  await cta().click();
  await urlIs(/\/resumen/, 20000);
  step("variante_articular_obliga_zona", true);

  // --- Resumen ----------------------------------------------------------------------------------
  await page.getByRole("link", { name: "Generar mi plan" }).waitFor();
  const resumenShot = await snap("resumen", true);
  const summary = (await page.locator("dl").textContent()) ?? "";
  for (const [label, text] of [
    ["foco", "Más músculo"],
    ["experiencia", "Más de 2 años"],
    ["semana", `${choice.days} días, ${choice.minutes} minutos`],
    ["deportes", sports.map((s) => s.name).join(", ")],
    ["gimnasio", `Básico, ${expectedEquipment.length} tipos de equipo`],
    ["limitaciones", choice.limitation.label],
  ]) {
    check(summary.includes(text), "alta", `Resumen: ${label} no muestra «${text}»`, resumenShot);
  }
  check(!/cardíaco|embarazada|medicación/i.test(summary), "critica", "Resumen: muestra respuestas del cribado", resumenShot);
  const hp = must(await admin.from("health_profile").select("*").eq("user_id", userId).single(), "salud");
  report.bd.salud = { limitations: hp.limitations, screening_version: hp.screening_version, screening_passed: !!hp.screening_passed_at };
  check(JSON.stringify(hp.limitations) === JSON.stringify([choice.limitation.id]), "critica", `health_profile.limitations = ${JSON.stringify(hp.limitations)}`);
  check(!!hp.screening_passed_at && !!hp.screening_version, "alta", "health_profile sin cribado superado");
  const extraCols = Object.keys(hp).filter((k) => !["user_id", "limitations", "screening_version", "screening_passed_at", "updated_at", "created_at"].includes(k));
  check(extraCols.length === 0, "media", `health_profile tiene columnas inesperadas (¿respuestas del cribado?): ${extraCols.join(", ")}`);
  step("resumen", true);

  // --- Generando (IA real) → Plan → Hoy ---------------------------------------------------------
  await click("link", "Generar mi plan");
  await urlIs(/\/generando/);
  await snap("generando");
  const t0 = Date.now();
  await urlIs(/\/plan/, 150000).catch(async () => {
    const f = await snap("generando-fallo");
    const title = await page.locator("h1").first().textContent().catch(() => "?");
    throw new Error(`generar plan: ${title} (${f})`);
  });
  step("generar_plan", true, { ms: Date.now() - t0 });
  await page.waitForLoadState("networkidle");
  const planShot = await snap("plan");
  check((await page.getByText(/no es consejo médico/i).count()) > 0, "alta", "Plan: no aparece el aviso de que no es consejo médico", planShot);

  const plans = must(await admin.from("plans").select("id, focus, days_per_week, is_active, source, version").eq("user_id", userId), "planes");
  const active = plans.filter((p) => p.is_active);
  report.bd.planes = plans;
  check(active.length === 1, "critica", `Hay ${active.length} planes activos`);
  if (active[0]) {
    check(active[0].focus === choice.focus, "alta", `plans.focus = ${active[0].focus}, elegido ${choice.focus}`);
    check(active[0].days_per_week === choice.days, "alta", `plans.days_per_week = ${active[0].days_per_week}, elegido ${choice.days}`);
    const ps = must(await admin.from("plan_sessions").select("id, day_index, label").eq("plan_id", active[0].id).order("day_index"), "sesiones");
    check(ps.length === choice.days, "alta", `El plan tiene ${ps.length} sesiones y se eligieron ${choice.days} días`);
    const slots = must(
      await admin.from("plan_slots").select("plan_session_id, exercise_id, sets, exercise:exercises(joints, equipment_type_id)").in("plan_session_id", ps.map((s) => s.id)),
      "huecos",
    );
    const used = slots.filter((s) => s.exercise_id);
    report.bd.plan = ps.map((s) => ({ dia: s.day_index + 1, label: s.label, ejercicios: used.filter((x) => x.plan_session_id === s.id).length }));
    for (const d of report.bd.plan) check(d.ejercicios > 0, "alta", `Plan: el día ${d.dia} no tiene ejercicios`);
    const bad = used.filter((s) => (s.exercise?.joints ?? []).includes(choice.limitation.id));
    check(bad.length === 0, "critica", `Plan: ejercicios que cargan la rodilla: ${bad.map((b) => b.exercise_id).join(", ")}`, planShot);
    const offGym = used.filter((s) => !expectedEquipment.includes(s.exercise?.equipment_type_id));
    check(offGym.length === 0, "critica", `Plan: ejercicios con equipo que no se marcó: ${offGym.map((b) => `${b.exercise_id}(${b.exercise?.equipment_type_id})`).join(", ")}`, planShot);
    check(used.every((s) => s.sets >= 2), "alta", "Plan: hay ejercicios con menos de 2 series");
  }
  const calls = must(await admin.from("ai_calls").select("kind, outcome, input_tokens").eq("user_id", userId), "ai_calls");
  report.bd.ai_calls = calls;
  check(calls.some((c) => c.kind === "plan" && c.outcome === "ok"), "media", `ai_calls no registra la generación del plan como ok: ${JSON.stringify(calls)}`);

  await page.goto(`${base}/hoy`);
  await page.waitForLoadState("networkidle");
  const hoyShot = await snap("hoy");
  check(/\/hoy/.test(page.url()), "alta", `/hoy redirige a ${page.url().replace(base, "")}`, hoyShot);
  check((await page.getByRole("button", { name: /Empezar calibración|Empezar sesión/ }).count()) > 0, "alta", "Hoy: no aparece el botón para empezar", hoyShot);
  check((await page.getByText("Esta página no existe").count()) === 0, "alta", "Hoy da 404", hoyShot);
  // Con plan, la bienvenida y el wizard llevan a Hoy.
  await page.goto(`${base}/`);
  await page.waitForLoadState("networkidle");
  check(/\/hoy/.test(page.url()), "media", `Con plan, / lleva a ${page.url().replace(base, "")} en vez de /hoy`);
  step("hoy", true);
} catch (error) {
  step("error", false, { error: String(error).slice(0, 400), url: page.url() });
  const f = await snap("parada").catch(() => null);
  finding("alta", `Se paró en ${page.url().replace(base, "")}: ${String(error).slice(0, 300)}`, f ?? undefined);
} finally {
  await browser.close();
  // El usuario puede existir aunque el script se parara antes de encontrarlo.
  if (!userId) {
    const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    userId = (data?.users ?? []).find((u) => u.email === email)?.id ?? null;
  }
  report.ok = report.findings.every((f) => f.severity === "info");
  fs.writeFileSync(path.join(outDir, "informe.json"), JSON.stringify(report, null, 2));
  if (userId && !process.env.E2E_KEEP) await admin.auth.admin.deleteUser(userId);
  console.log(JSON.stringify({ script: "alta", ok: report.ok, outDir, steps: report.steps.map((s) => `${s.ok ? "ok" : "KO"} ${s.name}`), findings: report.findings, consoleErrors: report.consoleErrors.length }, null, 1));
}
