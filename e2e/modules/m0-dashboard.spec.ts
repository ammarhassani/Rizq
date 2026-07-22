import { test, expect } from "../fixtures/auth";

/**
 * M0 — Dashboard Home. Fresh (main) user has no data, so the dashboard must show its
 * empty state and the core nav affordances. Spec-v2 Part III M0.
 */
test.describe("M0 Dashboard", () => {
  test("renders the dashboard + core nav", async ({ page }) => {
    await page.goto("/en/dashboard");

    await expect(page.getByRole("heading", { level: 1, name: /welcome/i })).toBeVisible();
    // Core nav / chrome (data-independent — the main user accumulates records across the suite).
    await expect(page.getByRole("link", { name: /upgrade/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /command palette/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /start a project/i })).toBeVisible();
  });

  test("stays on dashboard (onboarding gate already cleared)", async ({ page }) => {
    await page.goto("/en/dashboard");
    await expect(page).toHaveURL(/\/en\/dashboard/);
  });
});
