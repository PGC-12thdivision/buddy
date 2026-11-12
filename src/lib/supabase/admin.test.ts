import { describe, expect, it } from "vitest";

describe("cliente admin", () => {
  it("se puede importar bajo Vitest (server-only sustituido)", async () => {
    await expect(import("./admin")).resolves.toHaveProperty("createAdminClient");
  });
});
