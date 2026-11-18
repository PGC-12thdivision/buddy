import { describe, expect, it } from "vitest";
import { parseConfirmParams, safeNext } from "./confirm";

const params = (query: string) => new URLSearchParams(query);

describe("safeNext", () => {
  it("acepta una ruta interna", () => {
    expect(safeNext("/consentimiento")).toBe("/consentimiento");
    expect(safeNext("/resumen?volver=1")).toBe("/resumen?volver=1");
  });

  it("rechaza rutas que salen del sitio y usa la de por defecto", () => {
    for (const bad of ["//evil.com", "https://evil.com", "/\\evil.com", "\\\\evil.com", "evil.com", "", null, "/%2F%2Fevil.com"]) {
      expect(safeNext(bad)).toBe("/consentimiento");
    }
  });
});

describe("parseConfirmParams", () => {
  it("acepta el enlace de confirmación de la plantilla", () => {
    expect(parseConfirmParams(params("token_hash=abc123&type=email&next=/consentimiento"))).toEqual({
      ok: true,
      kind: "token_hash",
      tokenHash: "abc123",
      type: "email",
      next: "/consentimiento",
    });
  });

  it("acepta type=signup y pone un next interno si falta", () => {
    expect(parseConfirmParams(params("token_hash=abc&type=signup"))).toMatchObject({ ok: true, type: "signup", next: "/consentimiento" });
  });

  it("rechaza un type no permitido", () => {
    expect(parseConfirmParams(params("token_hash=abc&type=recovery"))).toEqual({ ok: false });
    expect(parseConfirmParams(params("token_hash=abc&type=magiclink"))).toEqual({ ok: false });
  });

  it("rechaza un enlace sin token", () => {
    expect(parseConfirmParams(params("type=email"))).toEqual({ ok: false });
  });

  it("un next externo se cambia por la ruta interna", () => {
    expect(parseConfirmParams(params("token_hash=abc&type=email&next=//evil.com"))).toMatchObject({ next: "/consentimiento" });
    expect(parseConfirmParams(params("token_hash=abc&type=email&next=https://evil.com"))).toMatchObject({ next: "/consentimiento" });
  });
});

describe("parseConfirmParams con la plantilla por defecto (code)", () => {
  it("acepta el code de vuelta de Supabase", () => {
    expect(parseConfirmParams(params("code=xyz&next=/consentimiento"))).toEqual({ ok: true, kind: "code", code: "xyz", next: "/consentimiento" });
  });

  it("un enlace caducado vuelve con error_code y se rechaza", () => {
    expect(parseConfirmParams(params("error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid"))).toEqual({ ok: false });
  });

  it("con code, un next externo también se cambia por la ruta interna", () => {
    expect(parseConfirmParams(params("code=xyz&next=//evil.com"))).toMatchObject({ next: "/consentimiento" });
  });
});
