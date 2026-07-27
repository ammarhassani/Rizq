import { test, expect } from "../fixtures/auth";
import { gotoReady } from "../fixtures/selectors";

/**
 * M6 — Simple Invoicing. The builder renders with client + items pickers and the VAT (15%)
 * control (confirming the Saudi rate in the UI). Deep subtotal+15%+total math and numbering
 * are unit-tested (invoices/*) + covered by the audit. Full create needs a client + a catalog
 * item (multi-dependency) — exercised in golden-path territory; here we validate the
 * money-bearing controls. Spec-v2 M6.
 *
 * Whether the VAT switch can be *operated* depends on the freelancer's VAT registration
 * (feature 011 — charging VAT unregistered is illegal), so that lives in
 * m6-vat-eligibility.spec.ts, which owns the profile state. This test asserts only that the
 * control is present and honest about itself, which holds either way.
 */
test.describe("M6 Invoicing", () => {
  test("invoice builder renders with a VAT (15%) control", async ({ page }) => {
    await gotoReady(page, "/en/invoices/new");
    await expect(page.getByText(/new invoice/i).first()).toBeVisible();

    // The 15% VAT rate is surfaced in the UI (Saudi standard).
    await expect(page.getByText(/VAT \(15%\)/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /create invoice/i })).toBeVisible();

    const vat = page.getByRole("switch", { name: /VAT/i });
    await expect(vat).toBeVisible();

    // Either it is operable, or it is disabled AND says why — never disabled in silence.
    if (await vat.isEnabled()) {
      const before = await vat.getAttribute("aria-checked");
      await vat.click();
      await expect(vat).not.toHaveAttribute("aria-checked", before ?? "");
    } else {
      await expect(page.locator("#vat-blocked-reason")).toBeVisible();
    }
  });
});
