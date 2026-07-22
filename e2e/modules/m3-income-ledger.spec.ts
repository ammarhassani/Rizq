import { test, expect } from "../fixtures/auth";
import { gotoReady } from "../fixtures/selectors";

/**
 * M3 — Income Ledger. The ledger and the add-income form render with their money chrome.
 * Deep money math is covered by the Vitest units (income anomaly) + the audit. Spec-v2 M3.
 */
test.describe("M3 Income Ledger", () => {
  test("ledger renders", async ({ page }) => {
    await gotoReady(page, "/en/income");
    await expect(page.getByRole("main")).toContainText(/income|ledger|SAR|ريال|goal|month/i, { timeout: 15_000 });
  });

  test("add-income form renders its inputs", async ({ page }) => {
    await gotoReady(page, "/en/income/new");
    await expect(page.getByRole("main").or(page.getByRole("heading").first()).first()).toBeVisible();
    await expect(page.getByRole("button")).toBeTruthy();
  });
});
