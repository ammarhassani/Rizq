import type { Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

/**
 * Disposable test-user provisioning. Email confirmation is OFF in Supabase Auth,
 * so a browser signup yields an immediate session (used for storageState cookies).
 * The onboarding gate is DB state (users.onboarded_at); we clear it via the user's
 * OWN authenticated client — exactly what the completeOnboarding server action does
 * (RLS allows a user to update their own row). This is deterministic and avoids
 * depending on the 10-step wizard UI. See specs/008-production-validation/research.md D4.
 */

export type DisposableUser = { email: string; password: string; userId?: string };

let counter = 0;
export function uniqueUser(tag = "e2e"): DisposableUser {
  // Real, GoTrue-accepted domain (plus sub-addressing); confirmation off => no mail sent.
  const stamp = `${Date.now()}-${Math.floor(Math.random() * 1e6)}-${counter++}`;
  return {
    email: `azahrani337+rizq${tag}-${stamp}@gmail.com`,
    password: `RizqE2e!${Math.floor(Math.random() * 1e6)}`,
  };
}

/** Signs up via the UI so @supabase/ssr cookies are set on the browser context. */
export async function signUpViaUi(
  page: Page,
  baseURL: string,
  user: DisposableUser = uniqueUser(),
): Promise<DisposableUser> {
  await page.goto(`${baseURL}/en/signup`, { waitUntil: "domcontentloaded" });
  await page.getByRole("textbox", { name: "Email" }).fill(user.email);
  await page.getByRole("textbox", { name: "Password" }).fill(user.password);
  await page.getByRole("button", { name: /create account/i }).click();

  await page.waitForURL(/\/(onboarding|dashboard|verify-email)/, { timeout: 30_000 });
  if (page.url().includes("/verify-email")) {
    throw new Error(
      "Signup landed on /verify-email — email confirmation is still ENABLED in Supabase Auth. " +
        "Disable it (Auth > Providers > Email > Confirm email) so headless signup can get a session.",
    );
  }
  return user;
}

/**
 * Marks onboarding complete for the user via their own authenticated client, clearing
 * the /dashboard -> /onboarding redirect gate. Returns the user's id (handy for RLS tests).
 */
export async function forceCompleteOnboarding(user: DisposableUser): Promise<string> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) throw new Error("Supabase env missing — check playwright.config.ts .env.local loader");

  const client = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await client.auth.signInWithPassword({
    email: user.email,
    password: user.password,
  });
  if (error || !data.user) throw new Error(`sign-in failed for ${user.email}: ${error?.message}`);
  const uid = data.user.id;

  const nowIso = new Date().toISOString();
  const { error: upErr } = await client
    .from("users")
    .update({
      onboarding_completed: true,
      onboarding_completed_at: nowIso,
      onboarded_at: nowIso,
      last_active: nowIso,
      // The harness drives the golden path to a PAID invoice, which calls
      // contribute_benchmark. Declaring the account here is what stops a fabricated
      // price entering the pricing corpus as a "verified freelancer submission" —
      // nothing else distinguishes a disposable user from a real one.
      is_test_account: true,
    })
    .eq("id", uid);
  if (upErr) throw new Error(`onboarding force-complete failed for ${user.email}: ${upErr.message}`);
  return uid;
}

/** Full provision: browser signup (cookies) + DB gate-clear. */
export async function provisionUser(
  page: Page,
  baseURL: string,
  tag = "e2e",
): Promise<DisposableUser> {
  const user = await signUpViaUi(page, baseURL, uniqueUser(tag));
  user.userId = await forceCompleteOnboarding(user);
  return user;
}
