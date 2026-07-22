import { test, expect } from "../fixtures/auth";
import { createClientViaUi } from "../fixtures/selectors";

/**
 * Data/UI feedback is live: a mutation reflects in the UI without a manual reload. We create a
 * client and assert it appears immediately on the detail page (no page.reload()).
 */
test.describe("Realtime / optimistic feedback", () => {
  test("a created client reflects in the UI without a manual reload", async ({ page }) => {
    const name = `RT Client ${Date.now()}`;
    // createClientViaUi navigates to the detail page on success — no manual reload.
    await createClientViaUi(page, name);
    await expect(page.getByText(name).first()).toBeVisible({ timeout: 10_000 });
  });

  test("submitting acknowledges the click and navigates (not a dead button)", async ({ page }) => {
    const name = `RT Pending ${Date.now()}`;
    await createClientViaUi(page, name);
    await expect(page).toHaveURL(/\/en\/clients\/[0-9a-f-]{6,}/i);
  });
});
