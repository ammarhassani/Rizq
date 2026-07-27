import { test, expect } from "../fixtures/auth";
import { signedInClient } from "../fixtures/supabaseClient";
import { gotoReady } from "../fixtures/selectors";

/**
 * VAT may only be applied by a freelancer who is VAT-registered AND has recorded a VAT
 * number (feature 011 / contracts/vat-eligibility.md). Charging VAT unregistered is a
 * legal violation in KSA, and a tax invoice without the registration number is invalid —
 * so this is asserted against the real profile, not a unit fixture.
 *
 * The unit tests cover the predicate; what only a browser can prove is that the control
 * the freelancer actually sees obeys it. Drives the English locale for deterministic copy.
 */

// These tests mutate one shared profile, so they must not interleave — the suite is
// fullyParallel by default and two workers would race each other's VAT state.
test.describe.configure({ mode: "serial" });

const VAT_SWITCH = { name: /VAT \(15%\)/i };

async function setVat(registered: boolean, number: string | null): Promise<void> {
  const { client, userId } = await signedInClient("main");
  const { error } = await client
    .from("users")
    .update({ vat_registered: registered, vat_number: number })
    .eq("id", userId);
  if (error) throw new Error(`could not set VAT profile state: ${error.message}`);
}

// Leave the shared main user as the suite found it — other specs create invoices.
test.afterAll(async () => {
  await setVat(false, null).catch(() => {});
});

test("not VAT-registered → the VAT control is unavailable and says why", async ({ page }) => {
  await setVat(false, null);
  await gotoReady(page, "/en/invoices/new");

  const vat = page.getByRole("switch", VAT_SWITCH);
  await expect(vat).toBeVisible();
  await expect(vat).toBeDisabled();
  await expect(vat).toHaveAttribute("aria-checked", "false");
  await expect(page.locator("#vat-blocked-reason")).toContainText(/not VAT-registered/i);
  // The explanation must offer a way forward, not just a refusal.
  await expect(page.getByRole("link", { name: /VAT details in your profile/i })).toBeVisible();
});

test("registered but no VAT number → still unavailable, and the reason names the number", async ({
  page,
}) => {
  await setVat(true, null);
  await gotoReady(page, "/en/invoices/new");

  const vat = page.getByRole("switch", VAT_SWITCH);
  await expect(vat).toBeDisabled();
  await expect(page.locator("#vat-blocked-reason")).toContainText(/not recorded your VAT number/i);
});

test("registered with a VAT number → VAT applies and reaches the totals", async ({ page }) => {
  await setVat(true, "300000000000003");
  await gotoReady(page, "/en/invoices/new");

  const vat = page.getByRole("switch", VAT_SWITCH);
  await expect(vat).toBeEnabled();
  await expect(page.locator("#vat-blocked-reason")).toHaveCount(0);

  await vat.click();
  await expect(vat).toHaveAttribute("aria-checked", "true");
  // With no line items there is nothing to tax yet; the VAT row appearing in the summary is
  // what proves the toggle is live. Item math is covered by the invoice unit tests.
  await expect(page.getByText(/VAT \(15%\)/i).first()).toBeVisible();
});
