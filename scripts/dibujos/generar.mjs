// Genera los dibujos de técnica a partir de Everkinetic (https://github.com/everkinetic/data,
// CC BY-SA 4.0, autor Greg Priday / everkinetic.com). Uso:
//   git clone --depth 1 https://github.com/everkinetic/data.git <dir>
//   node scripts/dibujos/generar.mjs <dir>
// Cambios sobre el original (exigido por la licencia): se quita el relleno blanco y se deja solo el
// trazo como máscara (la app lo pinta con los colores del tema), los PNG se recortan y se pasan a
// WebP con transparencia, y se eligen los fotogramas de inicio y final. Escribe public/ejercicios/ y
// src/lib/app/exercise-drawings.ts. Necesita Playwright (el mismo que usa scripts/e2e).
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const source = process.argv[2];
if (!source) throw new Error("Falta la ruta del repositorio de Everkinetic");
const root = path.resolve(import.meta.dirname, "../..");
const outDir = path.join(root, "public/ejercicios");
const map = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, "mapa.json"), "utf8"));
const OTHER = { r: "t", t: "r", 1: "2", 2: "1" };

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

// SVG: el original tiene un grupo blanco (fondo y rellenos) y otro de tinta. Se queda solo la tinta.
function svgFrame(id, frame) {
  const file = `${id}-${frame === "r" ? "relaxation" : "tension"}.svg`;
  const raw = fs.readFileSync(path.join(source, "dist/svg", file), "utf8");
  const ink = raw
    .replace(/<g fill="#fff">[\s\S]*?<\/g>|<path fill="#fff"[^>]*\/>/i, "")
    .replace(/fill="#[0-9a-f]{3,6}"/gi, 'fill="#000"');
  if (ink.length === raw.length || /#fff/i.test(ink)) throw new Error(`Estructura inesperada en ${file}`);
  const name = `s${id}-${frame}.svg`;
  svgJobs.set(name, ink.replace(/\s+/g, " ").trim());
  return name;
}

const svgJobs = new Map();

// PNG (escala de grises sobre blanco): la tinta pasa a alfa, se recorta al contenido y se reduce.
const pngJobs = [];
function pngFrame(id, frame) {
  const name = `w-${id}-${frame}.webp`;
  pngJobs.push({ input: path.join(source, "src/images-web", `${id}-${frame}.png`), output: path.join(outDir, name) });
  return name;
}

const drawings = {};
for (const [exercise, entry] of Object.entries(map)) {
  if (exercise === "_" || !entry) continue;
  const [kind, id] = entry.src.split(":");
  const make = kind === "s" ? svgFrame : pngFrame;
  drawings[exercise] = { start: make(id, entry.inicio), end: make(id, OTHER[entry.inicio]), similar: Boolean(entry.parecido) };
}

const unique = [...new Map(pngJobs.map((j) => [j.output, j])).values()];
{
  const pw = path.join(process.env.APPDATA ?? "", "npm/node_modules/@playwright/cli/node_modules/playwright-core/index.mjs");
  const { chromium } = await import(pathToFileURL(pw).href);
  const browser = await chromium.launch();
  const page = await browser.newPage();
  // SVG: viewBox recortado al trazo (los originales traen mucho margen y el dibujo salía pequeño).
  for (const [name, svg] of svgJobs) {
    await page.setContent(`<html><body>${svg}</body></html>`);
    const box = await page.evaluate(() => {
      const b = document.querySelector("svg").getBBox();
      return [b.x, b.y, b.width, b.height];
    });
    const pad = 3;
    const viewBox = [box[0] - pad, box[1] - pad, box[2] + 2 * pad, box[3] + 2 * pad].map((n) => Math.round(n * 10) / 10).join(" ");
    const cropped = svg.replace(/<svg[^>]*>/, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">`);
    fs.writeFileSync(path.join(outDir, name), cropped);
  }
  for (const job of unique) {
    const data = `data:image/png;base64,${fs.readFileSync(job.input).toString("base64")}`;
    const webp = await page.evaluate(async (src) => {
      const img = new Image();
      img.src = src;
      await img.decode();
      const c = document.createElement("canvas");
      c.width = img.width;
      c.height = img.height;
      const g = c.getContext("2d");
      g.drawImage(img, 0, 0);
      const px = g.getImageData(0, 0, c.width, c.height);
      let [x0, y0, x1, y1] = [c.width, c.height, 0, 0];
      for (let i = 0; i < px.data.length; i += 4) {
        const lum = (px.data[i] + px.data[i + 1] + px.data[i + 2]) / 3;
        const alpha = Math.min(255, Math.round((255 - lum) * 2));
        px.data[i] = px.data[i + 1] = px.data[i + 2] = 0;
        px.data[i + 3] = alpha;
        if (alpha > 40) {
          const p = i / 4;
          const x = p % c.width;
          const y = (p - x) / c.width;
          x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
        }
      }
      g.putImageData(px, 0, 0);
      const pad = 8;
      const [w, h] = [x1 - x0 + 2 * pad, y1 - y0 + 2 * pad];
      const scale = Math.min(1, 480 / Math.max(w, h));
      const out = document.createElement("canvas");
      out.width = Math.round(w * scale);
      out.height = Math.round(h * scale);
      out.getContext("2d").drawImage(c, x0 - pad, y0 - pad, w, h, 0, 0, out.width, out.height);
      return out.toDataURL("image/webp", 0.85);
    }, data);
    fs.writeFileSync(job.output, Buffer.from(webp.split(",")[1], "base64"));
  }
  await browser.close();
}

const lines = Object.entries(drawings)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([id, d]) => `  ${id}: { start: "${d.start}", end: "${d.end}"${d.similar ? ", similar: true" : ""} },`);
fs.writeFileSync(
  path.join(root, "src/lib/app/exercise-drawings.ts"),
  `// Generado por scripts/dibujos/generar.mjs a partir de scripts/dibujos/mapa.json. No editar a mano.
// Dibujos de Everkinetic (everkinetic.com, Greg Priday), CC BY-SA 4.0, adaptados (ver public/ejercicios/LEEME.md).
// start: posición con la que empieza la repetición; end: la otra punta del movimiento; similar: el
// dibujo es de una variante cercana del ejercicio.

export type ExerciseDrawing = { start: string; end: string; similar?: boolean };

export const DRAWINGS: Readonly<Record<string, ExerciseDrawing>> = {
${lines.join("\n")}
};
`,
);
console.log(`${Object.keys(drawings).length} ejercicios con dibujo; ${fs.readdirSync(outDir).length} archivos`);
