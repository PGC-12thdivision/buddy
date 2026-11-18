import { describe, expect, it } from "vitest";
import { isAuthorizedCron } from "./cron";

describe("isAuthorizedCron (KTD9)", () => {
  it("solo acepta exactamente 'Bearer <CRON_SECRET>'", () => {
    expect(isAuthorizedCron("Bearer s3creto", "s3creto")).toBe(true);
    for (const header of [null, "", "s3creto", "Bearer s3cret", "Bearer s3creto2", "bearer s3creto"]) {
      expect(isAuthorizedCron(header, "s3creto")).toBe(false);
    }
  });

  it("sin CRON_SECRET falla cerrado", () => {
    for (const header of [null, "", "Bearer ", "Bearer undefined"]) {
      expect(isAuthorizedCron(header, undefined)).toBe(false);
      expect(isAuthorizedCron(header, "")).toBe(false);
    }
  });
});
