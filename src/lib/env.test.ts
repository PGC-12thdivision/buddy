import { describe, expect, it } from "vitest";
import { parsePublicEnv, parseServerEnv, requireServerVar } from "./env";

const publicVars = {
  NEXT_PUBLIC_SUPABASE_URL: "https://abc.supabase.co",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
};

const serverVars = {
  ...publicVars,
  SUPABASE_SECRET_KEY: "sb_secret_test",
  CRON_SECRET: "cron-secret-value",
};

describe("parsePublicEnv", () => {
  it("devuelve las variables públicas tipadas", () => {
    expect(parsePublicEnv(publicVars)).toEqual({
      supabaseUrl: "https://abc.supabase.co",
      supabasePublishableKey: "sb_publishable_test",
    });
  });

  it("no incluye ninguna variable de servidor", () => {
    const parsed = parsePublicEnv(serverVars);
    expect(JSON.stringify(parsed)).not.toContain("sb_secret_test");
    expect(JSON.stringify(parsed)).not.toContain("cron-secret-value");
  });
});

describe("parseServerEnv", () => {
  it("devuelve las variables de servidor con todas presentes", () => {
    expect(parseServerEnv(serverVars).supabaseSecretKey).toBe("sb_secret_test");
  });

  it("sin SUPABASE_SECRET_KEY falla nombrando la variable y sin mostrar valores", () => {
    const rest: Record<string, string | undefined> = { ...serverVars, SUPABASE_SECRET_KEY: undefined };
    expect(() => parseServerEnv(rest)).toThrow(/SUPABASE_SECRET_KEY/);
    try {
      parseServerEnv(rest);
    } catch (error) {
      expect(String(error)).not.toContain("sb_publishable_test");
      expect(String(error)).not.toContain("cron-secret-value");
    }
  });

  it("rechaza una clave legacy en lugar de la secreta nueva (D26)", () => {
    expect(() => parseServerEnv({ ...serverVars, SUPABASE_SECRET_KEY: "eyJhbGciOi.legacy" })).toThrow(
      /SUPABASE_SECRET_KEY/,
    );
  });
});

describe("requireServerVar", () => {
  it("devuelve el valor de una variable opcional que está presente", () => {
    expect(requireServerVar(serverVars, "CRON_SECRET")).toBe("cron-secret-value");
  });

  it("falla cerrado si la variable no está configurada", () => {
    expect(() => requireServerVar(publicVars, "CRON_SECRET")).toThrow(/CRON_SECRET/);
    expect(() => requireServerVar({ ...publicVars, CRON_SECRET: "" }, "CRON_SECRET")).toThrow(/CRON_SECRET/);
  });
});
