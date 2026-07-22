import { test, expect } from "../fixtures/auth";
import { gotoReady, robustFill } from "../fixtures/selectors";
import { readFileSync } from "node:fs";

/**
 * Auth flows (Part II). Runs in an ANONYMOUS context (no stored session). Covers the
 * protected-route gate + returnTo, fresh signup -> session, login, and the signed-in bounce.
 */
test.use({ storageState: { cookies: [], origins: [] } });

function mainCreds(): { email: string; password: string } {
  return JSON.parse(readFileSync("e2e/.auth/users.json", "utf8")).main;
}

test.describe("Auth", () => {
  test("gated route redirects to login with returnTo", async ({ page }) => {
    await page.goto("/en/dashboard");
    await expect(page).toHaveURL(/\/en\/login/, { timeout: 15_000 });
    expect(page.url()).toMatch(/returnTo=/);
  });

  // FINDING (recorded in the maturity report): page-level gated routes (invoices, income,
  // clients, ...) redirect("/login") WITHOUT a returnTo param — only the middleware-gated
  // /dashboard + /onboarding preserve it. So deep-linking to a page-gated route loses the
  // destination after login (lands on dashboard). This test pins that ACTUAL behavior.
  test("deep-link to a page-gated route loses returnTo after login (known gap)", async ({ page }) => {
    const { email, password } = mainCreds();
    await page.goto("/en/invoices"); // page-level redirect -> /login WITHOUT returnTo
    await expect(page).toHaveURL(/\/en\/login/);
    expect(page.url(), "invoices redirect omits returnTo (finding)").not.toMatch(/returnTo=/);
    await robustFill(page.getByRole("textbox", { name: /email/i }), email);
    await robustFill(page.getByRole("textbox", { name: /password/i }).first(), password);
    await page.getByRole("button", { name: /sign in|log in|login/i }).click();
    // Lands on the default (dashboard), not the originally requested /invoices.
    await expect(page).toHaveURL(/\/en\/dashboard/, { timeout: 20_000 });
  });

  test("fresh signup gets an immediate session (email confirmation OFF)", async ({ page }) => {
    const stamp = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    await gotoReady(page, "/en/signup");
    await robustFill(page.getByRole("textbox", { name: "Email" }), `azahrani337+rizqauth-${stamp}@gmail.com`);
    await robustFill(page.getByRole("textbox", { name: "Password" }), `RizqE2e!${stamp.slice(-6)}`);
    await page.getByRole("button", { name: /create account/i }).click();
    // Immediate session -> onboarding or dashboard (NOT verify-email).
    await page.waitForURL(/\/(onboarding|dashboard)/, { timeout: 30_000 });
    expect(page.url()).not.toContain("/verify-email");
  });

  test("signed-in user is bounced off /login", async ({ page }) => {
    const { email, password } = mainCreds();
    await gotoReady(page, "/en/login");
    await robustFill(page.getByRole("textbox", { name: /email/i }), email);
    await robustFill(page.getByRole("textbox", { name: /password/i }).first(), password);
    await page.getByRole("button", { name: /sign in|log in|login/i }).click();
    await expect(page).toHaveURL(/\/en\/dashboard/, { timeout: 20_000 });
    // Now revisiting /login bounces back to the app.
    await page.goto("/en/login");
    await expect(page).toHaveURL(/\/en\/dashboard/, { timeout: 15_000 });
  });
});
