import { test, expect } from "../fixtures/auth";
import { gotoReady, robustFill } from "../fixtures/selectors";

/**
 * M10 — Rate Calculator. Reverse-pricing: monthly target -> required rate.
 * NOTE (a11y finding, in the report): the three selects here are role=combobox with NO
 * accessible name (no aria-label; combobox role does not derive its name from text), so they
 * can only be targeted positionally — a real accessibility gap the axe suite also flags.
 * The reverse-pricing math + the audit's HIGH `is_realistic` finding are covered separately.
 */
test.describe("M10 Rate Calculator", () => {
  test("renders the goal inputs and a calculate action", async ({ page }) => {
    await gotoReady(page, "/en/rate-calculator");
    await expect(page.getByRole("heading", { name: /rate calculator/i })).toBeVisible();
    await expect(page.getByRole("spinbutton").first()).toBeVisible(); // monthly target
    await expect(page.getByRole("main").getByRole("combobox")).toHaveCount(3); // specialty, city, level
    await expect(page.getByRole("button", { name: /calculate rate/i })).toBeVisible();
  });

  test("entering a target + selections enables the calculation", async ({ page }) => {
    await gotoReady(page, "/en/rate-calculator");
    await expect(page.getByRole("button", { name: /calculate rate/i })).toBeDisabled();

    await robustFill(page.getByRole("spinbutton").first(), "10000");
    const combos = page.getByRole("main").getByRole("combobox");
    for (let i = 0; i < 3; i++) {
      await combos.nth(i).click();
      await page.getByRole("option").first().click({ timeout: 8_000 }).catch(() => {});
    }
    await expect(page.getByRole("button", { name: /calculate rate/i })).toBeEnabled({ timeout: 10_000 });
  });
});
