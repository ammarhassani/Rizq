import { defineConfig, devices } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Load .env.local into process.env so fixtures (e.g. the RLS direct-query
// supabase client) can read NEXT_PUBLIC_SUPABASE_URL / _ANON_KEY without a
// dotenv dependency. next dev loads it separately for the app itself.
// ponytail: 8-line parser instead of adding dotenv for one file.
try {
  const raw = readFileSync(resolve(__dirname, ".env.local"), "utf8");
  for (const line of raw.split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
} catch {
  /* .env.local absent in some CI — fixtures that need it will fail loudly */
}

export const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
export const MAIN_STATE = "e2e/.auth/main.json";
export const ISOLATION_STATE = "e2e/.auth/isolation.json";

export default defineConfig({
  testDir: "./e2e",
  // AI (DeepSeek) calls are slow AND `next dev` cold-compiles each route on first hit; give
  // specs room but fail eventually. (Against a production build the compile cost disappears.)
  timeout: 120_000,
  expect: { timeout: 15_000 },
  // Real DeepSeek + real Supabase: keep concurrency modest so we don't hammer
  // the model or trip rate limits. Signup happens once in global-setup.
  workers: process.env.CI ? 2 : 3,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  globalSetup: "./e2e/setup/global-setup.ts",
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "off",
    // Default: authenticated as the main disposable user. Specs that need an
    // anonymous context (auth-flows, share-tokens) override with
    // test.use({ storageState: { cookies: [], origins: [] } }).
    storageState: MAIN_STATE,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } },
    },
  ],
  webServer: {
    command: "pnpm dev",
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    stdout: "ignore",
    stderr: "pipe",
  },
});
