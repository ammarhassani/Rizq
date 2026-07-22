import { test, expect } from "../fixtures/auth";
import { gotoReady, createClientViaUi } from "../fixtures/selectors";

/**
 * M2 — Client Book. Create a client and confirm it persists into the book.
 * The Arabic name is the only required field. Spec-v2 Part III M2.
 */
test.describe("M2 Client Book", () => {
  test("create a client and see it persist", async ({ page }) => {
    const name = `E2E Client ${Date.now()}`;

    // Self-healing create (handles the controlled-input hydration race, incl. under load).
    await createClientViaUi(page, name);
    await expect(page.getByText(name).first()).toBeVisible({ timeout: 15_000 });

    // Persists in the list after a fresh load.
    await gotoReady(page, "/en/clients");
    await expect(page.getByText(name).first()).toBeVisible({ timeout: 15_000 });
  });

  test("empty required name is rejected with an inline error", async ({ page }) => {
    await gotoReady(page, "/en/clients/new");
    await page.getByRole("button", { name: /save client/i }).click();
    await expect(page.getByRole("alert").filter({ hasText: /required/i })).toBeVisible();
    await expect(page).toHaveURL(/\/clients\/new/);
  });
});
