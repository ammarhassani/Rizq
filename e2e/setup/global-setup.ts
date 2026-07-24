import { chromium, type FullConfig } from "@playwright/test";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { provisionUser, type DisposableUser } from "../fixtures/users";
import { signedInClient } from "../fixtures/supabaseClient";

/**
 * Clears the reused main user's clients (and the gigs that FK-depend on them) so
 * a repeated run starts under the free-tier client cap. Without this, every full
 * run leaves ~1 more client behind; after ~10 runs the reused user hits the cap
 * and client-creation specs fail against a paywall the app is CORRECT to show —
 * a data-exhaustion false negative, not a bug. Best-effort: logs and continues.
 */
async function resetMainUserClients(): Promise<void> {
  try {
    const { client, userId } = await signedInClient("main");
    // gigs first — they reference clients; delete only this user's rows (RLS also scopes).
    await client.from("gigs").delete().eq("user_id", userId);
    const { error } = await client.from("clients").delete().eq("user_id", userId);
    if (error) {
      console.log(`[global-setup] client reset skipped: ${error.message}`);
    } else {
      console.log("[global-setup] reset reused main user's clients (repeatable run)");
    }
    await client.auth.signOut();
  } catch (err) {
    console.log(`[global-setup] client reset skipped: ${(err as Error).message}`);
  }
}

/**
 * Provisions two disposable users (main + isolation) once per run and saves their
 * @supabase/ssr cookie sessions as storageState. Also writes their credentials + ids to
 * e2e/.auth/users.json (gitignored) so the RLS-isolation spec can sign in via supabase-js.
 * Exactly 2 signups per run (rate-limit: 5/5min/IP).
 */

const MAIN_STATE = "e2e/.auth/main.json";
const ISOLATION_STATE = "e2e/.auth/isolation.json";
const USERS_FILE = "e2e/.auth/users.json";

export default async function globalSetup(config: FullConfig) {
  const baseURL =
    config.projects[0]?.use?.baseURL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  // Reuse existing sessions locally to avoid burning signups (rate limit 5/5min/IP)
  // across iteration runs. CI or FORCE_PROVISION always provisions fresh.
  if (!process.env.CI && !process.env.FORCE_PROVISION && existsSync(USERS_FILE) &&
      existsSync(MAIN_STATE) && existsSync(ISOLATION_STATE)) {
    // eslint-disable-next-line no-console
    console.log("[global-setup] reusing existing e2e/.auth sessions (set FORCE_PROVISION=1 to refresh)");
    // Freshly-provisioned users start empty; a REUSED main user accumulates
    // clients across runs and eventually trips the free-tier cap, so reset it.
    await resetMainUserClients();
    return;
  }

  const browser = await chromium.launch();
  const users: Record<string, DisposableUser> = {};
  try {
    for (const [key, statePath] of [
      ["main", MAIN_STATE],
      ["isolation", ISOLATION_STATE],
    ] as const) {
      const context = await browser.newContext();
      const page = await context.newPage();
      const user = await provisionUser(page, baseURL, key);
      mkdirSync(dirname(statePath), { recursive: true });
      await context.storageState({ path: statePath });
      users[key] = user;
      await context.close();
      // eslint-disable-next-line no-console
      console.log(`[global-setup] provisioned ${key}: ${user.email} (${user.userId})`);
    }
  } finally {
    await browser.close();
  }

  writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), "utf8");
}
