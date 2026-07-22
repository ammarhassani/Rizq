import { test, expect } from "../fixtures/auth";
import { gotoReady, robustFill } from "../fixtures/selectors";

/**
 * M8 — Onboarding (deep profile wizard). Needs a FRESH, un-onboarded user, so this spec signs
 * up its own user in an anonymous context (does NOT complete onboarding). Covers: the wizard
 * renders, the profile-strength meter, step advancement, and resume-on-reload. Spec-v2 M8.
 * NOTE: consumes 1 signup (rate limit 5/5min/IP).
 */
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("M8 Onboarding", () => {
  test("wizard renders with strength meter, advances, and resumes on reload", async ({ page }) => {
    const stamp = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    await gotoReady(page, "/en/signup");
    await robustFill(page.getByRole("textbox", { name: "Email" }), `azahrani337+rizqonb-${stamp}@gmail.com`);
    await robustFill(page.getByRole("textbox", { name: "Password" }), `RizqE2e!${stamp.slice(-6)}`);
    await page.getByRole("button", { name: /create account/i }).click();

    await page.waitForURL(/\/(onboarding|dashboard)/, { timeout: 30_000 });
    await expect(page).toHaveURL(/\/onboarding/);

    // Step 1: language + intro.
    await expect(page.getByText(/step 1 of/i)).toBeVisible();
    await page.getByRole("button", { name: /let'?s go/i }).click();

    // Step 2: identity + the profile-strength meter.
    await expect(page.getByText(/profile strength/i)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/step 2 of/i)).toBeVisible();

    // Advance a step (skip is available on skippable steps).
    await page.getByRole("button", { name: /skip this step/i }).first().click();
    await expect(page.getByText(/step 3 of/i)).toBeVisible({ timeout: 10_000 });

    // Resume-on-reload: reloading keeps the user in the onboarding wizard (not bounced to the
    // dashboard, since onboarding isn't complete). (Skip doesn't persist step progress — only
    // Save & continue does — so we assert wizard continuity, not the exact resumed step.)
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/onboarding/);
    await expect(page.getByText(/step \d+ of/i)).toBeVisible({ timeout: 10_000 });
  });
});
