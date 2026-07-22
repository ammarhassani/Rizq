import { test, expect } from "../fixtures/auth";
import { gotoReady } from "../fixtures/selectors";

/**
 * Arabic-first / RTL (Constitution Principle II). Arabic renders dir=rtl, both locales render
 * key pages, and no raw missing-translation markers leak (e.g. "Namespace.key" or "MISSING").
 */
const PAGES = ["/dashboard", "/proposals/new", "/clients/new", "/invoices/new", "/hadaf", "/rate-calculator"];

// A raw next-intl key that leaked to the UI looks like "Word.word.word" or contains MISSING_MESSAGE.
const MISSING_KEY = /\b[A-Z][A-Za-z]+\.[a-zA-Z]+\.[a-zA-Z.]+\b|MISSING_MESSAGE|\[\[.*?\]\]/;

test.describe("i18n / RTL", () => {
  test("Arabic dashboard is RTL, English is LTR", async ({ page }) => {
    await gotoReady(page, "/ar/dashboard");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await gotoReady(page, "/en/dashboard");
    await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
  });

  for (const p of PAGES) {
    test(`both locales render without missing keys: ${p}`, async ({ page }) => {
      for (const locale of ["ar", "en"]) {
        await gotoReady(page, `/${locale}${p}`);
        await expect(page.getByRole("main").or(page.getByRole("heading").first()).first()).toBeVisible({ timeout: 15_000 });
        const main = (await page.getByRole("main").textContent().catch(() => "")) || "";
        expect(main, `missing-key marker on /${locale}${p}`).not.toMatch(MISSING_KEY);
      }
    });
  }
});
