import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

const { planTitle } = await import("./context");

describe("planTitle", () => {
  it("cuerpo completo cuando todos los días lo son", () => {
    expect(planTitle(3, ["Cuerpo completo", "Cuerpo completo", "Cuerpo completo"])).toBe("3 días, cuerpo completo");
  });

  it("torso y pierna alternos", () => {
    expect(planTitle(4, ["Torso", "Pierna", "Torso", "Pierna"])).toBe("4 días, torso y pierna");
  });

  it("refleja los días rehechos como cuerpo completo (D68)", () => {
    expect(planTitle(4, ["Cuerpo completo", "Pierna", "Cuerpo completo", "Pierna"])).toBe("4 días, cuerpo completo y pierna");
    expect(planTitle(5, ["Torso", "Pierna", "Cuerpo completo", "Pierna", "Torso"])).toBe("5 días, torso, pierna y cuerpo completo");
  });

  it("sin días, solo el número", () => {
    expect(planTitle(3, [])).toBe("3 días");
  });
});
