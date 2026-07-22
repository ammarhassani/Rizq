import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Mock "server-only" so tests can import server modules without crashing.
      "server-only": path.resolve(__dirname, "./src/__mocks__/server-only.ts"),
    },
  },
  test: {
    environment: "node",
    // Unit tests live in src/. The e2e/ Playwright specs use @playwright/test and must not be
    // collected by Vitest (they call test.describe()/test.use() outside a Playwright runner).
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["**/node_modules/**", "e2e/**", "**/*.d.ts"],
  },
});
