import { test, expect } from "../fixtures/auth";
import { gotoReady } from "../fixtures/selectors";

/**
 * M12 — Document Vault. Renders the vault + the upload surface. Categorize/expiry AI is
 * unit-tested + covered by the audit; share tokens are covered by share-tokens.spec. Spec-v2 M12.
 */
test.describe("M12 Document Vault", () => {
  test("vault renders", async ({ page }) => {
    await gotoReady(page, "/en/documents");
    await expect(page.getByRole("main")).toContainText(/document|vault|upload|file|expiry|no documents/i, {
      timeout: 15_000,
    });
  });

  test("upload surface renders", async ({ page }) => {
    await gotoReady(page, "/en/documents/new");
    await expect(page.getByRole("main").or(page.getByRole("heading").first()).first()).toBeVisible();
  });
});
