import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
  test: {
    // Node environment only. Everything tested here is pure - the schema, the
    // fixtures, and the game logic. No DOM, no API key, no network, so
    // `npm test` runs anywhere and costs nothing.
    environment: "node",
    include: ["lib/**/*.test.ts"],
  },
});
