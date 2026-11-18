import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig(({ mode }) => ({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // `server-only` lanza al importarse fuera de React Server Components; en los tests se sustituye por un módulo vacío.
      "server-only": fileURLToPath(new URL("./src/test/server-only-stub.ts", import.meta.url)),
    },
  },
  test: {
    include: ["src/**/*.test.ts"],
    passWithNoTests: true,
    // La suite de RLS contra staging solo se activa con `npm run test:rls` (vitest --mode rls); `npm test` la omite.
    env: mode === "rls" ? { RUN_RLS_TESTS: "1" } : mode === "eval" ? { RUN_PLAN_EVAL: "1" } : {},
  },
}));
