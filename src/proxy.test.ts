import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { describe, expect, it } from "vitest";
import { config } from "./proxy";

const matches = (url: string) => unstable_doesMiddlewareMatch({ config, url });

describe("matcher del proxy", () => {
  it("refresca la sesión en las páginas de la app", () => {
    expect(matches("/")).toBe(true);
    expect(matches("/hoy")).toBe(true);
    expect(matches("/api/plan")).toBe(true);
  });

  it("no toca el webhook de Stripe ni los crons, que no llevan sesión", () => {
    expect(matches("/api/stripe/webhook")).toBe(false);
    expect(matches("/api/cron/inactividad")).toBe(false);
  });

  it("no toca los estáticos", () => {
    expect(matches("/_next/static/chunk.js")).toBe(false);
    expect(matches("/favicon.ico")).toBe(false);
  });
});
