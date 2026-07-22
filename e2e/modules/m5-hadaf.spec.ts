import { test, expect } from "../fixtures/auth";
import { gotoReady } from "../fixtures/selectors";

/**
 * M5 — HADAF Eligibility. Renders the eligibility surface. Threshold math is unit-tested
 * (hadaf/calculate) + covered by the audit. Spec-v2 M5.
 */
test.describe("M5 HADAF", () => {
  test("eligibility dashboard renders", async ({ page }) => {
    await gotoReady(page, "/en/hadaf");
    await expect(page.getByRole("main")).toContainText(/hadaf|هدف|eligib|qualify|subsidy|support|SAR|ريال/i, {
      timeout: 15_000,
    });
  });
});
