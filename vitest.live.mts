import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

/**
 * The LIVE config. Separate from vitest.config.mts on purpose.
 *
 * `npm test` uses the default config, whose include pattern is
 * `lib/**\/*.test.ts` and cannot match the file below. So no ordinary test run,
 * CI job, or pre-commit gate can ever spend money. Running a paid generation
 * requires naming this config explicitly, which is exactly the friction it
 * should have.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
      "server-only": fileURLToPath(new URL("./test/stubs/server-only.ts", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["lib/arcade/live-once.spec.ts"],
    testTimeout: 300_000,
  },
});
