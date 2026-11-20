// Graba en vídeo la demo de BUDDY para la entrega (20/11/2026), solo contra staging.
// Uso (desde la raíz del repo, con la app arrancada contra staging):
//   node scripts/demo/grabar.mjs [baseUrl]
// Variables opcionales:
//   DEMO_OUT   carpeta de salida (por defecto, el scratchpad de la sesión que lo creó)
//   DEMO_SRT   ruta del .srt (por defecto docs/entrega/demo.srt)
//   DEMO_KEEP  si existe, no borra el usuario de demo al terminar
//   PLAYWRIGHT_CORE  ruta a playwright-core/index.mjs (mismo patrón que scripts/e2e/ciclo.mjs)
//
// Qué hace:
// - Recorre en un móvil de 390×844 la bienvenida y el wizard completo tecleando como una persona.
// - Registro: rellena "Tu cuenta" pero no lo envía (sin SMTP propio el correo de Supabase no
//   llegaría a una dirección de prueba, D34). Crea la cuenta con admin.generateLink y la confirma
//   pasando por /auth/confirm con token_hash, el mismo camino que el enlace del email.
//   Las respuestas del wizard se guardan con el cliente admin, igual que hace `registrarse`.
// - Consentimiento, limitaciones (rodilla), cribado, plan con IA real, Hoy, Plan, sesión de
//   calibración con varias pruebas, una Molestia, fin de sesión, Progreso, Premium y Ajustes.
// - Anota el segundo de cada escena y escribe un .srt sincronizado con el vídeo.
// Lee las claves de .env.local y nunca las imprime. Se niega a correr contra prod.
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

const base = process.argv[2] ?? "http://localhost:3000";
if (/buddy-xi-eight|pfxyjotwlwvegqyzrrwl/.test(base)) throw new Error("Solo contra staging: esa URL es la de producción");

const corePath =
  process.env.PLAYWRIGHT_CORE ??
  path.join(process.env.APPDATA, "npm/node_modules/@playwright/cli/node_modules/playwright-core/index.mjs");
const { chromium } = await import(pathToFileURL(corePath).href);

const outDir =
  process.env.DEMO_OUT ??
  "C:/Users/USUARIO/AppData/Local/Temp/claude/db1d7d0fefc1d172/09aa5646-3033-4f3d-a3ff-af5cf43d8194/scratchpad/demo-video";
const srtPath = process.env.DEMO_SRT ?? "docs/entrega/demo.srt";
fs.mkdirSync(outDir, { recursive: true });
const shotsDir = path.join(outDir, "capturas");
fs.mkdirSync(shotsDir, { recursive: true });

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
const email = `demo-${Date.now()}@buddy.test`;
const password = `Demo-${Math.random().toString(36).slice(2, 8)}-X9`;

// Respuestas del wizard que se ven en el vídeo (y que se guardan en la cuenta).
const ANSWERS = { focus: "musculo", experience: "6_meses_2_anos", days: 3, minutes: 45, sports: ["padel"], preset: "completo" };

// --- Ritmo humano --------------------------------------------------------------------------
const VIEW = { width: 390, height: 844 };
const SCALE = 2;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const read = (s = 3) => wait(s * 1000); // pausa para que se pueda leer la pantalla

// --- Escenas y subtítulos -------------------------------------------------------------------
// Cada escena anota su segundo de inicio respecto al arranque del vídeo. El texto es el del
// guion (docs/entrega/guion-loom-4min.md), condensado para subtítulos.
const scenes = [];
let t0 = 0;
const scene = (id, text) => {
  const t = (Date.now() - t0) / 1000;
  scenes.push({ id, t, text });
  console.log(`[${t.toFixed(1).padStart(6)} s] ${id}`);
};
// Antes de cambiar de pantalla: espera a que la escena haya durado lo que se tarda en decir su
// texto (unas 150 palabras por minuto), para que voz y subtítulos quepan.
const hold = async () => {
  const sc = scenes[scenes.length - 1];
  if (!sc?.text) return;
  const need = sc.text.split(/\s+/).length / 2.5 + 0.5;
  const elapsed = (Date.now() - t0) / 1000 - sc.t;
  if (elapsed < need) await wait((need - elapsed) * 1000);
};
const problems = [];
const browserErrors = [];

function srtTime(s) {
  const ms = Math.max(0, Math.round(s * 1000));
  const h = String(Math.floor(ms / 3600000)).padStart(2, "0");
  const m = String(Math.floor((ms % 3600000) / 60000)).padStart(2, "0");
  const sec = String(Math.floor((ms % 60000) / 1000)).padStart(2, "0");
  return `${h}:${m}:${sec},${String(ms % 1000).padStart(3, "0")}`;
}

// Parte el texto de una escena en frases y las reparte por su duración (máx. ~84 caracteres por
// subtítulo, en dos líneas).
function chunks(text) {
  const out = [];
  for (const sentence of text.split(/(?<=[.!?])\s+/)) {
    if (sentence.length <= 84) out.push(sentence);
    else {
      let line = "";
      for (const word of sentence.split(" ")) {
        if ((line + " " + word).trim().length > 84) {
          out.push(line.trim());
          line = word;
        } else line += " " + word;
      }
      if (line.trim()) out.push(line.trim());
    }
  }
  return out.filter(Boolean);
}
function wrap(s) {
  if (s.length <= 42) return s;
  const mid = s.lastIndexOf(" ", Math.ceil(s.length / 2) + 4);
  return mid > 0 ? `${s.slice(0, mid)}\n${s.slice(mid + 1)}` : s;
}
function writeSrt(total) {
  let n = 0;
  const cues = [];
  scenes.forEach((sc, i) => {
    if (!sc.text) return;
    const end = i + 1 < scenes.length ? scenes[i + 1].t : total;
    const parts = chunks(sc.text);
    const weights = parts.map((p) => p.length);
    const sum = weights.reduce((a, b) => a + b, 0);
    let start = sc.t;
    parts.forEach((p, k) => {
      const dur = ((end - sc.t) * weights[k]) / sum;
      cues.push(`${++n}\n${srtTime(start)} --> ${srtTime(start + dur - 0.05)}\n${wrap(p)}\n`);
      start += dur;
    });
  });
  fs.mkdirSync(path.dirname(srtPath), { recursive: true });
  fs.writeFileSync(srtPath, cues.join("\n"), "utf8");
}

// --- Navegador -------------------------------------------------------------------------------
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: VIEW,
  deviceScaleFactor: SCALE,
  isMobile: true,
  hasTouch: false,
  locale: "es-ES",
  colorScheme: "light",
  // El vídeo se graba en píxeles CSS: con size = viewport × 2 la página queda en una esquina con el
  // resto en gris (probado el 20/11). deviceScaleFactor 2 solo da nitidez a las capturas PNG.
  recordVideo: { dir: outDir, size: VIEW },
});
// Indicador de toque: un círculo que aparece donde se pulsa, para que en el vídeo se vea qué se toca.
await context.addInitScript(() => {
  const draw = (x, y) => {
    const dot = document.createElement("div");
    dot.setAttribute("aria-hidden", "true");
    Object.assign(dot.style, {
      position: "fixed", left: `${x - 22}px`, top: `${y - 22}px`, width: "44px", height: "44px",
      borderRadius: "50%", background: "rgba(124, 58, 237, 0.35)", border: "3px solid rgba(124, 58, 237, 0.9)",
      zIndex: "2147483647", pointerEvents: "none", transition: "transform 450ms ease-out, opacity 450ms ease-out",
    });
    document.documentElement.appendChild(dot);
    requestAnimationFrame(() => {
      dot.style.transform = "scale(1.6)";
      dot.style.opacity = "0";
    });
    setTimeout(() => dot.remove(), 600);
  };
  window.addEventListener("pointerdown", (e) => draw(e.clientX, e.clientY), true);
});
t0 = Date.now(); // el vídeo empieza al crear la página
const page = await context.newPage();
page.on("console", (m) => m.type() === "error" && browserErrors.push(`${page.url().replace(base, "")}: ${m.text().slice(0, 200)}`));
page.on("pageerror", (e) => browserErrors.push(`pageerror ${page.url().replace(base, "")}: ${String(e).slice(0, 200)}`));

let shot = 0;
const snap = (name) => page.screenshot({ path: path.join(shotsDir, `${String(++shot).padStart(2, "0")}-${name}.png`) }).catch(() => {});
const tap = async (locator, { pause = 700 } = {}) => {
  const el = locator.first();
  await el.waitFor({ state: "visible", timeout: 20000 });
  await el.scrollIntoViewIfNeeded();
  await wait(pause); // el espectador ve el botón antes de que se pulse
  await el.click();
};
const role = (r, name, exact = false) => page.getByRole(r, { name, exact });
const cta = () => page.locator(".wz-cta").last();
const settle = async () => {
  await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
  await wait(400);
};
// Desplaza la página poco a poco (rueda), para enseñar una lista larga.
const glide = async (px, steps = 6) => {
  await page.mouse.move(VIEW.width / 2, VIEW.height / 2);
  for (let i = 0; i < steps; i++) {
    await page.mouse.wheel(0, px / steps);
    await wait(350);
  }
};
const top = () => page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
// Error visible en pantalla (sin contar el anunciador de rutas de Next).
const alertText = () =>
  page.locator("[role=alert]:not(#__next-route-announcer__)").first().textContent({ timeout: 300 }).catch(() => null);

let userId = null;
let failed = null;
try {
  // 1. Bienvenida -----------------------------------------------------------------------------
  await page.goto(`${base}/`);
  await settle();
  scene(
    "bienvenida",
    "Quien entrena solo en el gimnasio no sabe qué rutina seguir ni cuándo subir peso. Un entrenador es caro y las apps genéricas no conocen ni tu gimnasio ni tus limitaciones. BUDDY es para esa persona. Y desde la primera pantalla lo dice claro: no es consejo médico.",
  );
  await snap("bienvenida");
  await read(5);
  await hold();
  await tap(role("link", "Empezar", true));

  // 2. Foco -----------------------------------------------------------------------------------
  await page.waitForURL(/\/foco/);
  await settle();
  scene("foco", "Una pregunta por pantalla. Mi foco: más músculo.");
  await read(2);
  await tap(role("radio", /^Más músculo/));
  await read(1.5);
  await hold();
  await tap(cta());

  // 3. Experiencia ----------------------------------------------------------------------------
  await page.waitForURL(/\/experiencia/);
  await settle();
  scene("experiencia", "Mi experiencia: de seis meses a dos años.");
  await read(1.5);
  await tap(role("radio", /^De 6 meses a 2 años/));
  await read(1);
  await hold();
  await tap(cta());

  // 4. Semana ---------------------------------------------------------------------------------
  await page.waitForURL(/\/semana/);
  await settle();
  scene("semana", "Tres días a la semana, 45 minutos. La plantilla la decide el código, no la IA: con tres días, cuerpo completo.");
  await read(1.5);
  await tap(page.getByRole("radiogroup", { name: "Días por semana" }).getByRole("radio", { name: "3", exact: true }));
  await read(2);
  await tap(page.getByRole("radiogroup", { name: "Minutos por sesión" }).getByRole("radio", { name: "45", exact: true }));
  await read(1.5);
  await hold();
  await tap(cta());

  // 5. Deportes -------------------------------------------------------------------------------
  await page.waitForURL(/\/deportes/);
  await settle();
  scene("deportes", "Además juego al pádel.");
  await read(1.5);
  await tap(role("button", /Pádel/));
  await read(1.5);
  await hold();
  await tap(cta());

  // 6. Mi gimnasio ----------------------------------------------------------------------------
  await page.waitForURL(/\/gimnasio/);
  await settle();
  scene("gimnasio", "Y marco el equipo de mi gimnasio: tipos de máquina, no marcas.");
  await read(1.5);
  await tap(page.getByRole("radiogroup", { name: "Tipo de gimnasio" }).getByRole("radio", { name: /^Completo/ }));
  await read(2);
  await glide(500);
  await read(1);
  await snap("gimnasio");
  await hold();
  await tap(cta());

  // 7. Registro -------------------------------------------------------------------------------
  await page.waitForURL(/\/registro/);
  await settle();
  scene("registro", "Ahora creo la cuenta, con confirmación de mayoría de edad. Todavía no me ha pedido nada de salud.");
  await read(1.5);
  await page.getByLabel("Email").click();
  await page.getByLabel("Email").pressSequentially(email, { delay: 45 });
  await page.getByLabel("Contraseña").click();
  await page.getByLabel("Contraseña").pressSequentially(password, { delay: 60 });
  await tap(page.getByLabel("Tengo 18 años o más"));
  await read(2);
  await snap("registro");

  // Cuenta real con el mismo resultado que registrarse + abrir el enlace del email.
  const link = await admin.auth.admin.generateLink({ type: "signup", email, password });
  if (link.error || !link.data?.user) throw new Error(`generateLink: ${link.error?.code ?? "sin usuario"}`);
  userId = link.data.user.id;
  const { data: equipment } = await admin.from("equipment_types").select("id");
  const writes = await Promise.all([
    admin.from("onboarding_answers").insert({
      user_id: userId,
      focus: ANSWERS.focus,
      experience: ANSWERS.experience,
      days_per_week: ANSWERS.days,
      minutes_per_session: ANSWERS.minutes,
      sports: ANSWERS.sports,
    }),
    admin.from("gym_profiles").insert({ user_id: userId, preset: ANSWERS.preset, equipment_type_ids: equipment.map((e) => e.id) }),
  ]);
  for (const w of writes) if (w.error) throw new Error(`guardar respuestas: ${w.error.code}`);

  // No se pulsa "Crear mi cuenta": llamaría a signUp y Supabase intentaría mandar un correo a una
  // dirección de prueba. Se enseña directamente la pantalla de "revisa tu correo".
  await hold();
  await page.evaluate((e) => window.sessionStorage.setItem("buddy.registro.email", e), email);
  await page.goto(`${base}/revisa-tu-correo`);
  await settle();
  scene("correo", "Confirmo el email desde el enlace que llega al correo.");
  await read(3);
  await hold();
  await page.goto(
    `${base}/auth/confirm?token_hash=${encodeURIComponent(link.data.properties.hashed_token)}&type=signup&next=/consentimiento`,
  );

  // 8. Consentimiento -------------------------------------------------------------------------
  await page.waitForURL(/\/consentimiento/, { timeout: 30000 });
  await settle();
  scene(
    "consentimiento",
    "Antes de cualquier dato de salud, consentimiento explícito: la casilla no viene marcada y explica que Anthropic actúa como encargado del tratamiento.",
  );
  await read(3);
  await glide(300, 3);
  await tap(page.getByRole("checkbox"));
  await read(1.5);
  await snap("consentimiento");
  await hold();
  await tap(cta());

  // 9. Limitaciones ---------------------------------------------------------------------------
  await page.waitForURL(/\/limitaciones/);
  await settle();
  scene("limitaciones", "Marco la rodilla. Sin texto libre: son etiquetas de articulaciones, y la exclusión es determinista.");
  await read(2);
  await tap(role("button", "Rodilla", true));
  await read(2);
  await hold();
  await tap(cta());

  // 10. Cribado -------------------------------------------------------------------------------
  await page.waitForURL(/\/seguridad/);
  await settle();
  scene(
    "cribado",
    "El cribado tiene ocho preguntas. Cualquier sí de riesgo bloquea el plan. La articular es la excepción: obliga a marcar la zona, como acabo de hacer.",
  );
  await read(2);
  const groups = page.getByRole("radiogroup");
  await groups.first().waitFor();
  const count = await groups.count();
  for (let i = 0; i < count; i++) {
    const g = groups.nth(i);
    const label = (await g.getAttribute("aria-label")) ?? "";
    const yes = /huesos, articulaciones/.test(label);
    await tap(g.getByRole("radio", { name: yes ? "Sí" : "No", exact: true }), { pause: 450 });
  }
  await read(1.5);
  await snap("cribado");
  await hold();
  await tap(cta());

  // 11. Resumen y generación ------------------------------------------------------------------
  await page.waitForURL(/resumen|generando|plan/, { timeout: 30000 });
  if (page.url().includes("resumen")) {
    await settle();
    scene("resumen", "Reviso el resumen y genero mi plan.");
    await read(3);
    await hold();
    await tap(role("link", "Generar mi plan"));
  }
  await page.waitForURL(/generando|plan/, { timeout: 30000 });
  scene(
    "generando",
    "Aquí trabaja Claude, desde el servidor. Solo recibe el catálogo filtrado por equipo, mi foco y mis días: nada de salud.",
  );
  await snap("generando");
  const tGen = Date.now();
  await page.waitForURL(/\/plan/, { timeout: 180000 }).catch(async () => {
    await snap("generando-fallo");
    throw new Error(`no llegó al plan: ${(await alertText()) ?? (await page.locator("h1").first().textContent().catch(() => ""))}`);
  });
  console.log(`  plan generado en ${((Date.now() - tGen) / 1000).toFixed(1)} s`);

  // 12. Plan ----------------------------------------------------------------------------------
  await settle();
  scene(
    "plan",
    "Mi plan: tres sesiones de cuerpo completo. La IA solo puede elegir ejercicios del catálogo, y su respuesta se valida con zod y con los topes de volumen en código. Ningún ejercicio carga la rodilla: la limitación se aplicó después, en código, y la IA nunca la vio. Los que solo la rozan llevan un aviso de técnica. La primera sesión es de calibración, y el aviso médico también está aquí.",
  );
  await snap("plan");
  await read(3);
  await glide(900, 8);
  await read(2);
  await glide(900, 8);
  await read(2);
  await top();
  await read(1);
  await hold();

  // 13. Hoy -----------------------------------------------------------------------------------
  await page.goto(`${base}/hoy`);
  await settle();
  scene("hoy", "Esto es Hoy: la sesión que toca. Empiezo.");
  await snap("hoy");
  await read(3);
  await hold();
  await tap(cta());
  await page.waitForURL(/\/sesion\//, { timeout: 30000 });
  await settle();

  // 14. Sesión: calibración, Molestia y fin ---------------------------------------------------
  scene(
    "sesion-paso",
    "Cada ejercicio enseña la técnica con un dibujo. La primera vez no hay peso fijado: se calibra.",
  );
  await snap("sesion-paso");
  await read(3);
  await glide(500, 4);
  await read(1.5);
  await top();

  let exercise = 0; // ejercicios empezados
  let pruebas = 0; // series de calibración en este ejercicio
  let molestia = false;
  let calibrationNarrated = false;
  let rirNarrated = false;
  for (let guard = 0; guard < 80; guard++) {
    await wait(500);
    if (/\/fin/.test(page.url())) break;
    // Paso entre ejercicios: tras el tercero se termina la sesión.
    const empezar = role("button", "Empezar", true);
    if ((await empezar.count()) > 0) {
      if (exercise >= 3) {
        scene("terminar", "Por hoy, suficiente: termino la sesión.");
        await read(2);
        await hold();
        await tap(role("button", "Terminar la sesión ahora"));
        await page.waitForURL(/\/fin/, { timeout: 30000 }).catch(() => {});
        break;
      }
      if (exercise > 0) await read(2);
      await hold();
      await tap(empezar);
      exercise++;
      pruebas = 0;
      continue;
    }
    if ((await role("button", "Ahora no").count()) > 0) {
      await tap(role("button", "Ahora no"));
      continue;
    }
    // Segundo ejercicio: Molestia.
    if (exercise === 2 && !molestia && (await role("button", /^Tengo molestia/).count()) > 0) {
      scene(
        "molestia",
        "Si algo duele, el botón Molestia está siempre a la vista. Se para ese ejercicio hoy, sin subir carga, y queda marcado. Nunca se empuja.",
      );
      await read(2.5);
      await tap(role("button", /^Tengo molestia/));
      await read(3.5);
      await snap("molestia");
      await hold();
      await tap(role("button", "Parar este ejercicio", true));
      molestia = true;
      await page
        .waitForFunction(() => !document.querySelector("[role=dialog]") || /Ahora no/.test(document.body.innerText), null, { timeout: 15000 })
        .catch(() => {});
      await read(2);
      continue;
    }
    // Calibración: respuesta de la prueba (repeticiones y reserva).
    const rir = page.getByRole("group", { name: /Cuántas más/ });
    if ((await rir.count()) > 0) {
      if (!rirNarrated) {
        scene(
          "calibracion-rir",
          "¿Cuántas más podría haber hecho? Si digo cuatro o más, la regla sube un salto de la máquina. Con dos o tres, el peso queda fijado. Lo decide una función pura con tests, no la IA.",
        );
        rirNarrated = true;
        await read(4);
        await snap("calibracion-rir");
      } else await read(2);
      // Primera prueba del primer ejercicio: "4 o más" (sube); después, "2" (fija).
      const answer = exercise === 1 && pruebas === 1 ? "4 o más" : "2";
      await hold();
      await tap(rir.getByRole("button", { name: answer, exact: true }));
      await read(2);
      continue;
    }
    if ((await role("button", "Guardar la prueba", true).count()) > 0) {
      await tap(role("button", "Guardar la prueba", true));
      continue;
    }
    const calibrando = (await page.locator('main[aria-label^="Calibración"]').count()) > 0;
    if (calibrando && (await role("button", "Serie hecha", true).count()) > 0) {
      if (!calibrationNarrated) {
        scene(
          "calibracion",
          "Calibración: empiezo con una carga baja y hago la serie de prueba. Los números grandes son el peso y las repeticiones, con más y menos para una mano.",
        );
        calibrationNarrated = true;
        await snap("calibracion");
        await read(3.5);
      } else await read(2);
      await hold();
      await tap(role("button", "Serie hecha", true));
      pruebas++;
      continue;
    }
    if ((await role("button", "Serie hecha", true).count()) > 0) {
      // Serie normal (no debería salir en la primera sesión, pero se registra).
      await read(2);
      await tap(role("button", "Serie hecha", true));
      continue;
    }
    const alert = await alertText();
    if (alert) {
      problems.push(`Sesión: error en pantalla: ${alert.slice(0, 160)}`);
      await snap("sesion-error");
      break;
    }
  }
  await page.waitForURL(/\/fin/, { timeout: 30000 }).catch(() => problems.push(`La sesión no llegó al fin (${page.url().replace(base, "")})`));
  await settle();
  await read(1.5); // deja pasar la animación de "Sesión completada" antes de la captura
  scene("fin", "Fin de sesión: lo que hice hoy. En la próxima, BUDDY precarga el peso que toca con la doble progresión.");
  await snap("fin");
  await read(5);

  // 15. Progreso, Premium y Ajustes -----------------------------------------------------------
  await hold();
  await page.goto(`${base}/progreso`);
  await settle();
  scene("progreso", "Progreso: el peso de trabajo de cada ejercicio, gratis para todos.");
  await snap("progreso");
  await read(3.5);
  await glide(600, 4);
  await read(1.5);

  await hold();
  await page.goto(`${base}/premium`);
  await settle();
  scene(
    "premium",
    "Premium son las funciones con IA, como el coach del check-in semanal. Al registrarte tienes 14 días de prueba, y el pago va con Stripe en modo test.",
  );
  await snap("premium");
  await read(4);
  await glide(700, 5);
  await read(2);

  await hold();
  await page.goto(`${base}/ajustes`);
  await settle();
  scene(
    "ajustes",
    "En Ajustes cambio mi gimnasio o mis limitaciones y el plan se refiltra gratis, sin IA. Y puedo retirar el consentimiento o borrar mi cuenta.",
  );
  await snap("ajustes");
  await read(3);
  await glide(900, 6);
  await read(3);
  await hold();
  scene("cierre", "Eso es BUDDY: la IA elige ejercicios; las reglas, los pesos.");
  await top();
  await read(3);
  await hold();
} catch (error) {
  failed = String(error).slice(0, 300);
  problems.push(`Se paró en ${page.url().replace(base, "")}: ${failed}`);
  await snap("parada");
} finally {
  const total = (Date.now() - t0) / 1000;
  const video = page.video();
  await context.close();
  const final = path.join(outDir, "buddy-demo.webm");
  // saveAs necesita el navegador abierto: el vídeo se termina de escribir al cerrar el contexto.
  if (video) {
    await video.saveAs(final);
    await video.delete().catch(() => {});
  }
  await browser.close();
  writeSrt(total);
  fs.writeFileSync(path.join(outDir, "escenas.json"), JSON.stringify({ total, scenes, problems, browserErrors }, null, 2));
  if (userId && !process.env.DEMO_KEEP) await admin.auth.admin.deleteUser(userId);
  console.log(JSON.stringify({ ok: !failed && problems.length === 0, video: final, segundos: Math.round(total), srt: srtPath, problems, browserErrors }, null, 2));
}
