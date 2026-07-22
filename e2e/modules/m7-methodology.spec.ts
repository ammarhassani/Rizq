import { test, expect } from "../fixtures/auth";
import { gotoReady } from "../fixtures/selectors";

/**
 * M7 — Methodology & Trust Hub. Renders the credibility/methodology content. Spec-v2 M7.
 */
test.describe("M7 Methodology", () => {
  test("methodology hub renders content", async ({ page }) => {
    await gotoReady(page, "/en/methodology");
    await expect(page.getByRole("main")).toContainText(/methodology|how|data|trust|source|provenance|honest/i, {
      timeout: 15_000,
    });
  });
});
