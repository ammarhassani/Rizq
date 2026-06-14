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
  },
});
