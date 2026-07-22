import { test, expect } from "../fixtures/auth";

/**
 * Public share-token safety. The token surface (/p /i /d /r) is the main UNAUTHENTICATED
 * attack surface. A guessed/altered token must resolve to a not-found state — never another
 * user's artifact — and must not 500. Positive rendering of a valid token is covered by the
 * audit (144-bit tokens via get_shared_* SECURITY DEFINER RPCs). Runs anonymous.
 */
test.use({ storageState: { cookies: [], origins: [] } });

// Matches the app's not-found/expired states in either locale (guessed tokens 404 in Arabic
// even under /en, since the artifact resolvers fall back to the default locale).
const NOT_FOUND = /not found|no longer|expired|invalid|doesn'?t exist|couldn'?t find|not available|404|لم نعثر|غير موجود|غير صحيح|تم نقله|منتهية|الصفحة/i;
const randHex = (n: number) => Array.from({ length: n }, () => "0123456789abcdef"[Math.floor(Math.random() * 16)]).join("");
const randUuid = () => `${randHex(8)}-${randHex(4)}-${randHex(4)}-${randHex(4)}-${randHex(12)}`;

for (const prefix of ["p", "i", "d"]) {
  test(`guessed share token /${prefix}/<random> does not leak an artifact`, async ({ page }) => {
    const res = await page.goto(`/en/${prefix}/${randHex(40)}`, { waitUntil: "domcontentloaded" });
    // No server crash.
    expect(res?.status(), "no 500 on bad token").toBeLessThan(500);
    // Renders a not-found/expired state, not a real artifact.
    await expect(page.locator("body")).toContainText(NOT_FOUND, { timeout: 15_000 });
  });
}

test("guessed /r/<random uuid> does not leak a saved query", async ({ page }) => {
  const res = await page.goto(`/en/r/${randUuid()}`, { waitUntil: "domcontentloaded" });
  expect(res?.status()).toBeLessThan(500);
  await expect(page.locator("body")).toContainText(NOT_FOUND, { timeout: 15_000 });
});
