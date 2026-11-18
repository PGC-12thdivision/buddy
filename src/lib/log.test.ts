import { describe, expect, it } from "vitest";
import { z } from "zod";
import { formatSafeLog } from "./log";

describe("formatSafeLog (KTD17)", () => {
  it("un error de Postgres con una articulación en `detail` se registra solo con su código", () => {
    const pgError = {
      code: "23505",
      message: 'duplicate key value violates unique constraint "health_profile_pkey"',
      details: "Key (limitaciones)=({rodilla}) already exists.",
      detail: "Key (limitaciones)=({rodilla}) already exists.",
      hint: "rodilla",
    };
    const line = formatSafeLog("guardar_limitaciones", pgError);
    expect(line).toBe('{"donde":"guardar_limitaciones","codigos":["23505"]}');
  });

  it("un error de zod se registra con los códigos de sus issues, sin los valores de entrada", () => {
    const result = z.object({ zona: z.enum(["hombro"]), dias: z.number() }).safeParse({ zona: "rodilla", dias: "tres" });
    if (result.success) throw new Error("el esquema debía fallar");
    expect(formatSafeLog("wizard", result.error)).toBe('{"donde":"wizard","codigos":["invalid_value","invalid_type"]}');
  });

  it("un código propio se registra tal cual", () => {
    expect(formatSafeLog("plan", { code: "limite_mensual" })).toBe('{"donde":"plan","codigos":["limite_mensual"]}');
  });

  it("un error sin código reconocible se registra como «desconocido», sin su mensaje", () => {
    expect(formatSafeLog("plan", new Error("rodilla"))).toBe('{"donde":"plan","codigos":["desconocido"]}');
    expect(formatSafeLog("plan", "rodilla")).toBe('{"donde":"plan","codigos":["desconocido"]}');
    expect(formatSafeLog("plan", { code: "Key (zona)=(rodilla)" })).toBe('{"donde":"plan","codigos":["desconocido"]}');
    expect(formatSafeLog("zona rodilla", { code: "23505" })).toBe('{"donde":"desconocido","codigos":["23505"]}');
  });
});
