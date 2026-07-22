import { expect, type Locator, type Page } from "@playwright/test";

/**
 * Shared helpers. The app's forms use React controlled inputs (value/onChange); a value
 * typed before hydration completes is reset by React's first render. `robustFill` retries
 * until the value sticks. `gotoReady` navigates and waits for the network to settle so
 * hydration has run. (This hydration race is also a minor real UX note — see the report.)
 */

export async function gotoReady(page: Page, path: string): Promise<void> {
  await page.goto(path, { waitUntil: "domcontentloaded" });
  // Give hydration a moment to settle, but CAP the wait: pages with persistent connections
  // (Supabase realtime, analytics beacons) never reach `networkidle`, and an uncapped wait
  // would burn the whole test timeout. 3s is enough for React to hydrate controlled inputs.
  await page.waitForLoadState("networkidle", { timeout: 3_000 }).catch(() => {});
}

export async function robustFill(field: Locator, value: string): Promise<void> {
  await field.waitFor({ state: "visible" });
  for (let i = 0; i < 6; i++) {
    // fill() is fast but can be lost to React hydration; after a couple of misses fall back to
    // per-character typing, which fires keydown/input per char and re-registers onChange once
    // the controlled component is hydrated.
    if (i < 2) {
      await field.fill(value);
    } else {
      await field.click();
      await field.fill("");
      await field.pressSequentially(value, { delay: 15 });
    }
    // eslint-disable-next-line no-await-in-loop
    if ((await field.inputValue()) === value) return;
    // eslint-disable-next-line no-await-in-loop
    await field.page().waitForTimeout(300);
  }
  await expect(field).toHaveValue(value); // final assert -> fails loudly if it never stuck
}

/**
 * The app's dropdowns are CUSTOM comboboxes (button[role=combobox] opening a role=listbox of
 * role=option), not native <select> — so page.selectOption() does not work. Open + click.
 */
/**
 * Create a client through the UI and return its id. Self-heals the controlled-input hydration
 * race: if the required-name guard fires (React state lagged behind the DOM fill), it re-fills
 * and re-submits once. Used by the money/AI journeys where a client is a prerequisite.
 */
export async function createClientViaUi(page: Page, name: string): Promise<string> {
  await gotoReady(page, "/en/clients/new");
  const field = page.getByRole("textbox", { name: "Client name" }).first();
  const save = page.getByRole("button", { name: /save client/i });
  const detail = /\/clients\/([0-9a-f-]{6,})/i;

  // Up to 2 attempts: the first can lose the redirect if React state lagged the DOM fill
  // (required-guard fires, stays on /new). We only re-submit when we're STILL on /new — never
  // when the create already navigated (a slow cold-compiled redirect), which would hang on a
  // Save button that no longer exists.
  for (let attempt = 0; attempt < 2; attempt++) {
    await robustFill(field, name);
    await save.click();
    try {
      await page.waitForURL(detail, { timeout: 30_000 });
    } catch {
      /* fall through to the URL check below */
    }
    const m = page.url().match(detail);
    if (m) return m[1];
    if (!page.url().includes("/clients/new")) {
      throw new Error(`client create landed on an unexpected URL: ${page.url()}`);
    }
    // still on /new (required-guard) -> loop and re-submit once
  }
  throw new Error("client create did not navigate to the detail page after 2 attempts");
}

/**
 * Proposal generation is two-stage: "Generate the proposal" runs (slow) AI scope extraction and
 * shows follow-up questions, then "Skip all" / "Done. Generate proposal" produces the artifact.
 * Real DeepSeek scope extraction can take up to ~2 min, so we poll for the finalize button (or a
 * direct navigation) rather than a fixed wait. Assumes stage 1 was already triggered.
 */
export async function finalizeProposal(page: Page): Promise<void> {
  const done = () => /\/proposals\/[0-9a-f-]{6,}/i.test(page.url());
  const finalize = page.getByRole("button", { name: /skip all|done\.?\s*generate proposal/i }).first();
  await expect(async () => {
    if (done()) return;
    if (await finalize.isVisible().catch(() => false)) await finalize.click().catch(() => {});
    if (!done()) throw new Error("proposal not finalized yet");
  }).toPass({ timeout: 180_000, intervals: [2500] });
  await page.waitForURL(/\/proposals\/[0-9a-f-]{6,}/i, { timeout: 60_000 });
}

export async function pickCombo(
  page: Page,
  nameRe: RegExp,
  opts: { index?: number; optionName?: string | RegExp } = {},
): Promise<void> {
  const combo = page.getByRole("combobox", { name: nameRe }).first();
  await combo.click();
  await page.getByRole("option").first().waitFor({ state: "visible", timeout: 5_000 }).catch(() => {});
  if (opts.optionName !== undefined) {
    await page.getByRole("option", { name: opts.optionName }).first().click();
  } else {
    await page.getByRole("option").nth(opts.index ?? 0).click();
  }
}
