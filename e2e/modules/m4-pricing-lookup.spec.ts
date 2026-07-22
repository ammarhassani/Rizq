import { test, expect } from "../fixtures/auth";
import { gotoReady, pickCombo } from "../fixtures/selectors";

/**
 * M4 — Pricing Lookup. Resolve a price and assert the result shows a range AND its provenance
 * citation (Constitution Principle I). NOTE: consumes 1 of the user's 3 monthly free queries —
 * do not loop this spec. Spec-v2 M4.
 */
test.describe("M4 Pricing Lookup", () => {
  test("resolve a price and verify the provenance citation", async ({ page }) => {
    await gotoReady(page, "/en/tool");
    await expect(page.getByRole("heading", { name: /find your fair rate/i })).toBeVisible();

    await pickCombo(page, /specialty/i);
    await pickCombo(page, /city/i);
    await pickCombo(page, /years|experience/i);
    await page.getByRole("button", { name: /calculate my price/i }).click();

    // A price range renders.
    await expect(page.locator("main")).toContainText(/SAR|ريال|\d{3,}/i, { timeout: 20_000 });
    // Honesty: the result must cite provenance / sample size / freshness.
    await expect(page.locator("main")).toContainText(
      /based on|records|sample|provenance|reasoned|published|as of|updated|founder|market data/i,
      { timeout: 15_000 },
    );
  });
});
