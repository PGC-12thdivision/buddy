import { describe, expect, it, vi } from "vitest";
import { buildTemplate } from "@/lib/domain/template";
import { ALL_EQUIPMENT_IDS, CATALOG } from "@/lib/domain/test-fixtures";
import { buildUserPrompt, costUsd, generatePlan, MAX_ATTEMPTS, SYSTEM_PROMPT, type CallModel, type ModelReply, type PlanOutput } from "./plan";

const template = buildTemplate(3, "equilibrado");
const profile = { focus: "equilibrado" as const, daysPerWeek: 3, minutesPerSession: 60, sports: ["padel"] };

function goodOutput(): PlanOutput {
  return {
    sesiones: template.sessions.map((s) => {
      const used: string[] = [];
      return {
        huecos: s.slots.map((slot) => {
          const e = CATALOG.find((x) => x.region === slot.region && !used.includes(x.id))!;
          used.push(e.id);
          return { ejercicio: e.id };
        }),
      };
    }),
  };
}

const parsed = (output: PlanOutput): ModelReply => ({ kind: "parsed", output, inputTokens: 1000, outputTokens: 200 });

const run = (callModel: CallModel, limitations: ("rodilla" | "hombro")[] = []) =>
  generatePlan({ model: "claude-sonnet-5-5", callModel, template, profile, catalog: CATALOG, equipmentIds: ALL_EQUIPMENT_IDS, limitations });

describe("generatePlan", () => {
  it("una respuesta correcta da un plan y un intento ok", async () => {
    const result = await run(vi.fn(async () => parsed(goodOutput())));
    expect(result.status).toBe("ok");
    expect(result.attempts).toEqual([{ outcome: "ok", inputTokens: 1000, outputTokens: 200 }]);
  });

  it("un ID fuera del subconjunto se reintenta y tras 2 reintentos devuelve error de validación", async () => {
    const bad = goodOutput();
    bad.sesiones[0].huecos[0].ejercicio = "inventado";
    const callModel = vi.fn(async () => parsed(bad));
    const result = await run(callModel);
    expect(result.status).toBe("validation_failed");
    expect(callModel).toHaveBeenCalledTimes(MAX_ATTEMPTS);
    expect(result.attempts.every((a) => a.outcome === "validation_failed")).toBe(true);
  });

  it("un reintento que sale bien da el plan", async () => {
    const bad = goodOutput();
    bad.sesiones.pop();
    const callModel = vi.fn<CallModel>().mockResolvedValueOnce(parsed(bad)).mockResolvedValueOnce(parsed(goodOutput()));
    const result = await run(callModel);
    expect(result.status).toBe("ok");
    expect(result.attempts.map((a) => a.outcome)).toEqual(["validation_failed", "ok"]);
  });

  it("pasado el plazo no empieza otro intento (la ruta cierra antes de su maxDuration)", async () => {
    const bad = goodOutput();
    bad.sesiones.pop();
    let clock = 0;
    const callModel = vi.fn(async () => {
      clock += 40_000;
      return parsed(bad);
    });
    const result = await generatePlan({
      model: "claude-sonnet-5-5", callModel, template, profile, catalog: CATALOG, equipmentIds: ALL_EQUIPMENT_IDS, limitations: [],
      deadlineMs: 75_000, now: () => clock,
    });
    expect(result.status).toBe("validation_failed");
    expect(callModel).toHaveBeenCalledTimes(2);
  });

  it("rechazo y respuesta vacía son resultados distintos y no se reintentan", async () => {
    expect((await run(vi.fn(async (): Promise<ModelReply> => ({ kind: "refused", inputTokens: 5, outputTokens: 0 })))).status).toBe("refused");
    expect((await run(vi.fn(async (): Promise<ModelReply> => ({ kind: "empty", inputTokens: 5, outputTokens: 0 })))).status).toBe("empty");
  });

  it("un error de red devuelve el estado de conexión", async () => {
    const result = await run(vi.fn(async (): Promise<ModelReply> => ({ kind: "connection" })));
    expect(result).toEqual({ status: "connection", attempts: [{ outcome: "connection", inputTokens: 0, outputTokens: 0 }] });
  });

  it("el prompt enviado es idéntico con y sin limitaciones (KTD19) y no lleva salud", async () => {
    const prompts: string[] = [];
    const callModel: CallModel = async (request) => {
      prompts.push(request.system + request.user);
      return parsed(goodOutput());
    };
    await run(callModel, []);
    await run(callModel, ["rodilla", "hombro"]);
    expect(prompts[0]).toBe(prompts[1]);
    // Las zonas como etiqueta ("rodilla", "hombro"), no los grupos musculares ("hombros").
    expect(prompts[0]).not.toMatch(/"rodilla"|"hombro"|limitaci|cribado|molestia|@/i);
  });

  it("el prompt solo lleva el catálogo del equipo del usuario", () => {
    const user = buildUserPrompt(template, profile, CATALOG, ["mancuernas"]);
    const ids = CATALOG.filter((e) => e.equipmentTypeId !== "mancuernas").map((e) => e.id);
    for (const id of ids) expect(user).not.toContain(`"${id}"`);
    expect(SYSTEM_PROMPT).not.toMatch(/limitaci/i);
  });
});

describe("costUsd", () => {
  it("usa los precios por millón de KTD7", () => {
    expect(costUsd("claude-sonnet-5-5", 1_000_000, 100_000)).toBe(3);
    expect(costUsd("claude-haiku-5-5", 1_000_000, 1_000_000)).toBe(0.6);
  });
});
