import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const verifyOtp = vi.fn();
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { verifyOtp } }) }));
const { GET } = await import("./route");

const get = (query: string) => GET(new NextRequest(`https://buddy.test/auth/confirm?${query}`));

beforeEach(() => {
  verifyOtp.mockReset();
  verifyOtp.mockResolvedValue({ error: null });
});

describe("/auth/confirm", () => {
  it("confirma y lleva al consentimiento", async () => {
    const response = await get("token_hash=abc&type=email&next=/consentimiento");
    expect(verifyOtp).toHaveBeenCalledWith({ type: "email", token_hash: "abc" });
    expect(response.headers.get("location")).toBe("https://buddy.test/consentimiento");
  });

  it("con next=//evil.com o https://evil.com se queda dentro del sitio", async () => {
    for (const next of ["//evil.com", "https://evil.com"]) {
      const location = (await get(`token_hash=abc&type=email&next=${encodeURIComponent(next)}`)).headers.get("location");
      expect(new URL(location!).origin).toBe("https://buddy.test");
    }
  });

  it("un type no permitido se rechaza sin llamar a Supabase", async () => {
    const response = await get("token_hash=abc&type=recovery");
    expect(verifyOtp).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toBe("https://buddy.test/entrar?aviso=enlace");
  });

  it("el error no lleva el mensaje de Supabase en la URL", async () => {
    verifyOtp.mockResolvedValue({ error: { code: "otp_expired", message: "Email link is invalid or has expired" } });
    const location = (await get("token_hash=abc&type=email")).headers.get("location")!;
    expect(location).toBe("https://buddy.test/entrar?aviso=enlace");
    expect(location).not.toMatch(/expired|invalid|otp/i);
  });
});
