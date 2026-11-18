// Evaluación del modelo del plan (plan.md U5, KTD7; PRD §18): 10 perfiles fijos de wizard por
// Sonnet 5.5 y Haiku 5.5, con el catálogo semilla de staging. Mide tasa de validación (primer
// intento y final), tokens, coste y tiempo, y escribe el informe en docs/eval-plan.md.
// Llama a la API de verdad (cuesta dinero): solo corre con `npm run eval:plan` (vitest --mode eval).
import { readFileSync, writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import type { Days } from "@/lib/domain/template";
import type { Exercise, Focus, Joint, Region } from "@/lib/domain/types";

function loadEnvLocal() {
  try {
    for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
      const m = /^([A-Z_]+)=(.*)$/.exec(line);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
    }
  } catch {
    // sin .env.local
  }
}
loadEnvLocal();

const enabled = process.env.RUN_PLAN_EVAL === "1" && Boolean(process.env.ANTHROPIC_API_KEY);

type Profile = { name: string; focus: Focus; days: Days; minutes: number; sports: string[]; preset: "completo" | "basico" | "peso_libre"; limitations: Joint[] };

const PROFILES: Profile[] = [
  { name: "Equilibrado 3d 60' completo", focus: "equilibrado", days: 3, minutes: 60, sports: [], preset: "completo", limitations: [] },
  { name: "Fuerza 4d 75' completo", focus: "fuerza", days: 4, minutes: 75, sports: [], preset: "completo", limitations: [] },
  { name: "Músculo 5d 60' completo", focus: "musculo", days: 5, minutes: 60, sports: [], preset: "completo", limitations: [] },
  { name: "Grasa 3d 45' básico + correr", focus: "grasa", days: 3, minutes: 45, sports: ["correr"], preset: "basico", limitations: [] },
  { name: "Equilibrado 2d 30' básico", focus: "equilibrado", days: 2, minutes: 30, sports: [], preset: "basico", limitations: [] },
  { name: "Músculo 4d 60' peso libre", focus: "musculo", days: 4, minutes: 60, sports: [], preset: "peso_libre", limitations: [] },
  { name: "Equilibrado 3d 45' completo, rodilla + pádel", focus: "equilibrado", days: 3, minutes: 45, sports: ["padel"], preset: "completo", limitations: ["rodilla"] },
  { name: "Fuerza 3d 60' básico, hombro", focus: "fuerza", days: 3, minutes: 60, sports: [], preset: "basico", limitations: ["hombro"] },
  { name: "Grasa 4d 45' completo, espalda baja + natación", focus: "grasa", days: 4, minutes: 45, sports: ["natacion"], preset: "completo", limitations: ["espalda_baja"] },
  { name: "Músculo 5d 75' completo, muñeca", focus: "musculo", days: 5, minutes: 75, sports: ["bici"], preset: "completo", limitations: ["muneca"] },
];

describe.skipIf(!enabled)("evaluación del modelo del plan", () => {
  it("pasa los 10 perfiles por Sonnet 5.5 y Haiku 5.5", { timeout: 1_800_000 }, async () => {
    const { callPlanModel } = await import("./client");
    const { costUsd, generatePlan, PLAN_MODELS } = await import("./plan");
    const { buildTemplate } = await import("@/lib/domain/template");
    const { presetEquipment } = await import("@/lib/wizard/answers");

    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false } });
    const [{ data: rows }, { data: equipment }] = await Promise.all([
      admin.from("exercises").select("*").order("id"),
      admin.from("equipment_types").select("id").order("id"),
    ]);
    const catalog: Exercise[] = (rows ?? []).map((r) => ({
      id: r.id, equipmentTypeId: r.equipment_type_id, pattern: r.pattern, region: r.region as Region,
      muscleGroups: r.muscle_groups, joints: r.joints as Joint[], calibrationLoadKg: Number(r.calibration_load_kg),
    }));
    const equipmentIds = (equipment ?? []).map((e) => e.id as string);
    expect(catalog.length).toBeGreaterThan(20);

    const lines: string[] = [];
    const summary: string[] = [];
    for (const model of PLAN_MODELS) {
      let firstOk = 0;
      let finalOk = 0;
      let cost = 0;
      let ms = 0;
      let inTok = 0;
      let outTok = 0;
      for (const p of PROFILES) {
        const started = Date.now();
        const result = await generatePlan({
          model,
          callModel: callPlanModel,
          template: buildTemplate(p.days, p.focus),
          profile: { focus: p.focus, daysPerWeek: p.days, minutesPerSession: p.minutes, sports: p.sports },
          catalog,
          equipmentIds: presetEquipment(p.preset, equipmentIds),
          limitations: p.limitations,
        });
        const elapsed = Date.now() - started;
        const i = result.attempts.reduce((s, a) => s + a.inputTokens, 0);
        const o = result.attempts.reduce((s, a) => s + a.outputTokens, 0);
        const c = costUsd(model, i, o);
        if (result.attempts[0]?.outcome === "ok") firstOk++;
        if (result.status === "ok") finalOk++;
        cost += c;
        ms += elapsed;
        inTok += i;
        outTok += o;
        const holes = result.status === "ok" ? result.plan.sessions.flatMap((s) => s.slots).filter((s) => !s.exerciseId).length : "-";
        lines.push(`| ${model} | ${p.name} | ${result.status} | ${result.attempts.map((a) => (a.reason ? `${a.outcome}(${a.reason})` : a.outcome)).join(" → ")} | ${holes} | ${i}/${o} | ${c.toFixed(4)} | ${(elapsed / 1000).toFixed(1)} |`);
      }
      const n = PROFILES.length;
      summary.push(
        `| ${model} | ${firstOk}/${n} | ${finalOk}/${n} | ${Math.round(inTok / n)} / ${Math.round(outTok / n)} | ${(cost / n).toFixed(4)} | ${cost.toFixed(4)} | ${(ms / n / 1000).toFixed(1)} |`,
      );
    }

    const report = [
      "# Evaluación del modelo del plan (U5, KTD7)",
      "",
      `Generado por \`npm run eval:plan\` el ${new Date().toISOString().slice(0, 10)} con el catálogo semilla de staging. 10 perfiles fijos (src/lib/ai/plan.eval.test.ts). "Válido" = la salida pasa catálogo, región, repetidos, limitaciones (aplicadas en código) y topes.`,
      "",
      "## Resumen",
      "",
      "| Modelo | Válido al 1.er intento | Válido final (≤3 intentos) | Tokens medios entrada / salida | Coste medio por plan ($) | Coste total ($) | Segundos por plan |",
      "|---|---|---|---|---|---|---|",
      ...summary,
      "",
      "## Detalle",
      "",
      "| Modelo | Perfil | Resultado | Intentos | Huecos | Tokens in/out | Coste ($) | Segundos |",
      "|---|---|---|---|---|---|---|---|",
      ...lines,
      "",
    ].join("\n");
    writeFileSync("docs/eval-plan.md", report);
    console.log(report);
  });
});
