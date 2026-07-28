/**
 * A real browser, signed in as a real freelancer.
 *
 * This is the harness the Ralph loop drives. It is deliberately NOT the Playwright test
 * runner: `e2e/` asserts things we already decided are true, which is how the last four
 * passes' defects survived — they all type-checked, unit-tested and conformed to spec while
 * being visibly wrong to a person holding the product. This drives the product instead, and
 * whatever it notices becomes a finding.
 *
 * Usage from an iteration script:
 *
 *   import { open, note } from "./session.mjs";
 *   await open(async ({ page, go, text, db }) => {
 *     await go("/ar/income");
 *     if ((await text()).includes("ليس رقمًا")) note("NaN on the income ledger");
 *   });
 *
 * State (a disposable account + its browser profile) lives in drive/.auth, which is
 * gitignored: the account is real, so its password must not be committed.
 */
import { chromium } from "@playwright/test";
import { isKnown } from "./ledger.mjs";
import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync, mkdirSync, existsSync, appendFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");
const AUTH_DIR = resolve(HERE, ".auth");
const USER_FILE = resolve(AUTH_DIR, "user.json");
const PROFILE_DIR = resolve(AUTH_DIR, "profile");
const SHOTS_DIR = resolve(AUTH_DIR, "shots");
const LOG_FILE = resolve(AUTH_DIR, "findings.log");

export const BASE = process.env.RIZQ_BASE_URL ?? "http://localhost:3000";

// ─── env ─────────────────────────────────────────────────────────────────────

function loadEnv() {
  try {
    for (const line of readFileSync(resolve(ROOT, ".env.local"), "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && process.env[m[1]] === undefined) {
        process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
      }
    }
  } catch {
    /* CI may inject env directly */
  }
}
loadEnv();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// ─── the disposable freelancer ───────────────────────────────────────────────

/**
 * The driver signs up its own account rather than reusing the e2e users, so a loop
 * iteration can never leave the assertion suite's fixtures in a surprising state.
 * Confirmation is off in Supabase Auth, so signup yields a session immediately.
 */
function newCredentials() {
  const stamp = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  return {
    email: `azahrani337+rizqdrive-${stamp}@gmail.com`,
    password: `RizqDrive!${Math.floor(Math.random() * 1e6)}`,
  };
}

function readUser() {
  return existsSync(USER_FILE) ? JSON.parse(readFileSync(USER_FILE, "utf8")) : null;
}

async function signUpThroughTheUi(page) {
  const user = newCredentials();
  await page.goto(`${BASE}/ar/signup`, { waitUntil: "domcontentloaded" });
  await page.locator("input[type=email]").fill(user.email);
  await page.locator("input[type=password]").fill(user.password);
  await page.getByRole("button", { name: /إنشاء حساب/ }).click();
  await page.waitForURL(/\/(onboarding|dashboard|verify-email)/, { timeout: 60_000 });
  if (page.url().includes("/verify-email")) {
    throw new Error(
      "Signup landed on /verify-email — email confirmation is ON in Supabase Auth. " +
        "Turn it off (Auth → Providers → Email → Confirm email) so the driver can hold a session.",
    );
  }
  mkdirSync(AUTH_DIR, { recursive: true });
  writeFileSync(USER_FILE, JSON.stringify(user, null, 2));
  return user;
}

async function signInThroughTheUi(page, user) {
  await page.goto(`${BASE}/ar/login`, { waitUntil: "domcontentloaded" });
  await page.locator("input[type=email]").fill(user.email);
  await page.locator("input[type=password]").fill(user.password);
  await page.getByRole("button", { name: /تسجيل الدخول|دخول/ }).first().click();
  await page.waitForURL(/\/(dashboard|onboarding)/, { timeout: 60_000 }).catch(() => {});
}

/** Is this page showing a signed-in shell? Behavioural check, not a cookie inspection. */
async function isSignedIn(page) {
  await page.goto(`${BASE}/ar/dashboard`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
  return !/\/login/.test(page.url());
}

/**
 * Clear the onboarding gate so the driver can reach the rest of the app.
 *
 * A brand-new account is redirected to /onboarding from everywhere, so without this the
 * sweeps silently examine the wizard eleven times and report nothing — a green run that
 * looked at nothing, which is worse than a red one.
 *
 * This writes the gate directly, exactly as `completeOnboarding` does (RLS lets a user
 * update their own row). That is a deliberate shortcut for iterations whose subject is the
 * REST of the product. Onboarding itself must be driven through the UI in its own iteration
 * — three of pass 2's defects lived in those eleven steps, and none of them were visible
 * from the database.
 */
async function ensureOnboarded(user) {
  const { client, userId } = await signedInDb(user);
  const { data } = await client.from("users").select("onboarded_at").eq("id", userId).maybeSingle();
  if (data?.onboarded_at) return false;
  const now = new Date().toISOString();
  const { error } = await client
    .from("users")
    .update({ onboarding_completed: true, onboarding_completed_at: now, onboarded_at: now })
    .eq("id", userId);
  if (error) throw new Error(`could not clear the onboarding gate: ${error.message}`);
  return true;
}

// ─── the session ─────────────────────────────────────────────────────────────

/**
 * Open a browser signed in as the driver's freelancer and hand it to `fn`.
 *
 * @param {(tools: object) => Promise<void>} fn
 * @param {{ viewport?: {width:number,height:number}, locale?: string, fresh?: boolean }} [opts]
 */
/**
 * Fail loudly, before spending a browser launch and a signup on it.
 *
 * The dev server died mid-session more than once while these passes were running, and a driver
 * that reports "route returned 0" for twenty routes buries the one fact that matters.
 */
async function preflight() {
  try {
    const res = await fetch(`${BASE}/ar`, { signal: AbortSignal.timeout(15_000) });
    if (!res.ok) throw new Error(`status ${res.status}`);
  } catch (err) {
    throw new Error(
      `${BASE} is not serving (${err.message}). Start it with \`pnpm dev\`, or point the driver ` +
        `elsewhere with RIZQ_BASE_URL.`,
    );
  }
}

export async function open(fn, opts = {}) {
  const { viewport = { width: 1280, height: 900 }, locale = "ar-SA", fresh = false, theme = "light" } = opts;
  await preflight();
  mkdirSync(SHOTS_DIR, { recursive: true });

  const ctx = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless: process.env.RIZQ_HEADED ? false : true,
    viewport,
    locale,
  });
  const page = ctx.pages()[0] ?? (await ctx.newPage());

  // next-themes reads its own localStorage key before paint (attribute="data-theme",
  // enableSystem off). Setting it up front means the FIRST render is already in the row's
  // theme — clicking the toggle afterwards would leave every check before the click
  // measuring light and quietly report it as dark coverage.
  await page.addInitScript((value) => {
    try {
      window.localStorage.setItem("theme", value);
    } catch {
      /* storage blocked — the app falls back to its light default */
    }
  }, theme);

  // Everything the browser complains about is evidence — a loop iteration should not have
  // to remember to listen for it.
  const problems = [];
  const visited = [];
  page.on("console", (m) => {
    if (m.type() === "error") problems.push(`console: ${m.text().slice(0, 200)}`);
  });
  page.on("pageerror", (e) => problems.push(`pageerror: ${String(e).slice(0, 200)}`));
  page.on("response", (r) => {
    const status = r.status();
    // 404s on a deliberately-unmatched URL are the app working; anything 5xx never is.
    if (status >= 500) problems.push(`http ${status} ${r.url().replace(BASE, "")}`);
  });

  const findings = [];
  const repeats = [];

  try {
    let user = fresh ? null : readUser();
    if (user) {
      if (!(await isSignedIn(page))) await signInThroughTheUi(page, user);
      if (!(await isSignedIn(page))) user = null; // password changed / account gone
    }
    if (!user) user = await signUpThroughTheUi(page);
    const gateCleared = await ensureOnboarded(user);
    console.log(`driving as ${user.email}${gateCleared ? " (onboarding gate cleared)" : ""}`);

    await fn({
      page,
      ctx,
      user,
      go: async (path, wait = 4000) => {
        const status = await goto(page, path, wait);
        visited.push(`${path} -> ${status}${page.url().includes(path) ? "" : " (redirected)"}`);
        return status;
      },
      text: () => page.evaluate(() => document.body.innerText.replace(/\n{2,}/g, "\n")),
      shot: (name) => shot(page, name),
      db: () => signedInDb(user),
      /**
       * Report something the product got wrong. A finding the ledger already carries is
       * counted but not shouted about: a loop that re-reports a known defect every iteration
       * teaches the next one nothing.
       */
      note: (finding) => {
        if (isKnown(finding)) {
          repeats.push(finding);
          return false;
        }
        findings.push(finding);
        note(finding);
        return true;
      },
      findings,
      problems,
    });
  } finally {
    // A silent run must be distinguishable from a run that looked at nothing.
    console.log(
      `\nvisited ${visited.length} route(s), ${findings.length} new finding(s)` +
        (repeats.length ? `, ${repeats.length} already in the ledger` : ""),
    );
    const redirected = visited.filter((v) => v.includes("(redirected)"));
    if (redirected.length) {
      console.log(`  ${redirected.length} redirected away from the requested path:`);
      for (const r of redirected.slice(0, 8)) console.log("    " + r);
    }
    if (problems.length) {
      console.log("--- browser complained ---");
      for (const p of [...new Set(problems)].slice(0, 20)) console.log("  " + p);
    }
    await ctx.close();
  }
}

async function goto(page, path, wait) {
  const res = await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await page.waitForTimeout(wait);
  return res?.status() ?? 0;
}

async function shot(page, name) {
  const path = resolve(SHOTS_DIR, `${name}.png`);
  await page.screenshot({ path, fullPage: true });
  console.log("shot:", path);
  return path;
}

/**
 * A supabase client signed in as the SAME freelancer, for confirming what the screen said
 * against what the database holds. Every pass so far turned on this step: the screen and the
 * row disagreeing is the finding.
 */
export async function signedInDb(user = readUser()) {
  if (!SUPABASE_URL || !SUPABASE_ANON) throw new Error("Supabase env missing — check .env.local");
  const client = createClient(SUPABASE_URL, SUPABASE_ANON, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.signInWithPassword({
    email: user.email,
    password: user.password,
  });
  if (error) throw new Error(`driver db sign-in failed: ${error.message}`);
  return { client, userId: data.user.id };
}

/**
 * Record something the product did wrong. Appended to drive/.auth/findings.log so an
 * iteration can see what earlier ones already noticed, and echoed so it shows in the run.
 */
export function note(finding) {
  mkdirSync(AUTH_DIR, { recursive: true });
  const line = `${new Date().toISOString()}  ${finding}`;
  appendFileSync(LOG_FILE, line + "\n");
  console.log("FINDING:", finding);
}

export { AUTH_DIR, SHOTS_DIR, LOG_FILE };
