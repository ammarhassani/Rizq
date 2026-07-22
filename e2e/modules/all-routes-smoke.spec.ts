import { test, expect } from "../fixtures/auth";

/**
 * Broad "does it render" coverage: visit every primary authenticated route as the main
 * user and assert it responds without a server error and renders real chrome (a <main> or
 * a heading), with no error-boundary text. This is the fast is-it-working signal across
 * all modules; deep per-module flows live in the other spec files.
 */

const ROUTES: { path: string; label: string }[] = [
  { path: "/en/dashboard", label: "M0 Dashboard" },
  { path: "/en/proposals", label: "M1 Proposals list" },
  { path: "/en/proposals/new", label: "M1 Proposal new" },
  { path: "/en/proposals/templates", label: "M1 Templates" },
  { path: "/en/clients", label: "M2 Clients" },
  { path: "/en/clients/new", label: "M2 Client new" },
  { path: "/en/income", label: "M3 Income" },
  { path: "/en/income/new", label: "M3 Income new" },
  { path: "/en/tool", label: "M4 Pricing tool" },
  { path: "/en/catalog", label: "M4 Catalog" },
  { path: "/en/hadaf", label: "M5 HADAF" },
  { path: "/en/invoices", label: "M6 Invoices" },
  { path: "/en/invoices/new", label: "M6 Invoice new" },
  { path: "/en/methodology", label: "M7 Methodology" },
  { path: "/en/onboarding", label: "M8 Onboarding" },
  { path: "/en/calendar", label: "M9 Calendar" },
  { path: "/en/rate-calculator", label: "M10 Rate calculator" },
  { path: "/en/documents", label: "M12 Documents" },
  { path: "/en/documents/new", label: "M12 Document new" },
  { path: "/en/projects", label: "Projects list" },
  { path: "/en/projects/start", label: "Projects start" },
  { path: "/en/settings", label: "Settings" },
  { path: "/en/upgrade", label: "Upgrade" },
];

for (const { path, label } of ROUTES) {
  test(`renders: ${label} (${path})`, async ({ page }) => {
    const res = await page.goto(path, { waitUntil: "domcontentloaded" });
    // Not a server error.
    expect(res?.status(), `${path} HTTP status`).toBeLessThan(500);
    // No error boundary / crash text.
    await expect(page.locator("body")).not.toContainText(/Internal Server Error|Application error|Unhandled Runtime Error/i);
    // Real chrome rendered.
    const main = page.getByRole("main");
    const heading = page.getByRole("heading").first();
    await expect(main.or(heading).first()).toBeVisible({ timeout: 20_000 });
  });
}
