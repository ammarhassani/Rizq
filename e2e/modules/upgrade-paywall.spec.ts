import { test, expect } from "../fixtures/auth";
import { gotoReady } from "../fixtures/selectors";
import { signedInClient } from "../fixtures/supabaseClient";

/**
 * Monetization / paywall (Part IV). The upgrade page renders tier/plan content, and — critically
 * — a signed-in NON-admin user must NOT be able to self-grant Pro. We probe the admin_grant_pro
 * SECURITY DEFINER RPC directly as the main user (the paywall-bypass candidate from the audit).
 */
test.describe("Upgrade / Paywall", () => {
  test("upgrade page renders plan/tier content", async ({ page }) => {
    await gotoReady(page, "/en/upgrade");
    await expect(page.getByRole("main").or(page.getByRole("heading").first()).first()).toBeVisible();
    await expect(page.locator("main")).toContainText(/pro|upgrade|plan|month|free|SAR|ريال/i, { timeout: 15_000 });
  });

  test("a signed-in non-admin cannot self-grant Pro via admin_grant_pro", async () => {
    const main = await signedInClient("main");
    // Attempt the privileged RPC as an ordinary user. It must be denied or must not grant Pro.
    const { data, error } = await main.client.rpc("admin_grant_pro", {
      p_user_id: main.userId,
      p_months: 12,
    });

    // Then confirm the user did NOT become Pro regardless of the RPC's return.
    const { data: me } = await main.client.from("users").select("pro_until").eq("id", main.userId).maybeSingle();
    const proUntil = (me as { pro_until?: string | null } | null)?.pro_until ?? null;
    const grantedFuturePro = proUntil !== null && new Date(proUntil).getTime() > Date.now();

    expect(
      Boolean(error) || !grantedFuturePro,
      `PAYWALL BYPASS: non-admin self-granted Pro (error=${error?.message ?? "none"}, pro_until=${proUntil}, rpc=${JSON.stringify(data)})`,
    ).toBeTruthy();
  });
});
