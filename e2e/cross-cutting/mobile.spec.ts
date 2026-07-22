import { test, expect, devices } from "@playwright/test";
import { gotoReady } from "../fixtures/selectors";

/**
 * Mobile-first (Constitution Principle III — 70% of Saudi traffic is mobile). On a phone
 * viewport, primary pages must not overflow horizontally and must render their main content.
 */
test.use({ ...devices["Pixel 5"], storageState: "e2e/.auth/main.json" });

const PAGES = ["/en/dashboard", "/en/proposals/new", "/en/clients/new", "/en/invoices/new", "/en/tool", "/en/hadaf"];

for (const path of PAGES) {
  test(`no horizontal overflow on mobile: ${path}`, async ({ page }) => {
    await gotoReady(page, path);
    await expect(page.getByRole("main").or(page.getByRole("heading").first()).first()).toBeVisible({ timeout: 15_000 });
    const overflow = await page.evaluate(() => {
      const el = document.documentElement;
      return el.scrollWidth - el.clientWidth;
    });
    // Allow 2px slack for sub-pixel rounding.
    expect(overflow, `horizontal overflow (px) on ${path}`).toBeLessThanOrEqual(2);
  });
}
