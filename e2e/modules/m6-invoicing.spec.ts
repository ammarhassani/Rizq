import { test, expect } from "../fixtures/auth";
import { gotoReady } from "../fixtures/selectors";

/**
 * M6 — Simple Invoicing. The builder renders with client + items pickers and the VAT (15%)
 * control (confirming the Saudi rate in the UI), and the VAT toggle is interactive. Deep
 * subtotal+15%+total math and numbering are unit-tested (invoices/*) + covered by the audit.
 * Full create needs a client + a catalog item (multi-dependency) — exercised in golden-path
 * territory; here we validate the money-bearing controls. Spec-v2 M6.
 */
test.describe("M6 Invoicing", () => {
  test("invoice builder renders with a VAT (15%) control", async ({ page }) => {
    await gotoReady(page, "/en/invoices/new");
    await expect(page.getByText(/new invoice/i).first()).toBeVisible();

    // The 15% VAT rate is surfaced in the UI (Saudi standard).
    await expect(page.getByText(/VAT \(15%\)/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /create invoice/i })).toBeVisible();

    // The VAT switch is interactive.
    const vat = page.getByRole("switch", { name: /VAT/i });
    await expect(vat).toBeVisible();
    const before = await vat.getAttribute("aria-checked");
    await vat.click();
    await expect(vat).not.toHaveAttribute("aria-checked", before ?? "");
  });
});
