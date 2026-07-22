import { test, expect } from "../fixtures/auth";
import { gotoReady } from "../fixtures/selectors";

/**
 * M9 — Calendar & Deadlines. Renders the calendar/deadlines surface. Date grouping is
 * unit-tested (calendar/group) + covered by the audit. Spec-v2 M9.
 */
test.describe("M9 Calendar", () => {
  test("calendar renders", async ({ page }) => {
    await gotoReady(page, "/en/calendar");
    await expect(page.getByRole("main")).toContainText(/calendar|deadline|upcoming|due|event|no upcoming/i, {
      timeout: 15_000,
    });
  });
});
