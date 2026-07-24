import { test, expect } from "@playwright/test";

/**
 * Sidebar click-navigation smoke.
 *
 * all-routes-smoke.spec.ts proves every route RENDERS when you page.goto() it.
 * That is not the same as the nav WORKING: if the shell errors during server
 * render, React re-renders the route on the client, the sidebar loses its
 * next-intl context, and its links stop navigating — every route still passes a
 * goto test while the app feels broken to a clicking user.
 *
 * This spec drives the real thing: click each sidebar link and assert the URL
 * actually changed and the destination rendered.
 */

// Sidebar entries from src/lib/apps.ts (sidebar: true), in registry order.
const NAV_HREFS = [
  "/dashboard",
  "/projects",
  "/proposals",
  "/clients",
  "/calendar",
  "/income",
  "/invoices",
  "/catalog",
  "/rate-calculator",
  "/tool",
  "/hadaf",
  "/documents",
  "/methodology",
  "/settings",
] as const;

const START = "/en/dashboard";

test.describe("sidebar click navigation", () => {
  test("every sidebar link is present and navigates on click", async ({ page }) => {
    const failures: string[] = [];

    await page.goto(START, { waitUntil: "domcontentloaded" });

    // The desktop sidebar is `hidden lg:flex`; the configured viewport (1280px)
    // is above the lg breakpoint, so it is the one rendering.
    const sidebar = page.locator("aside").first();
    await expect(sidebar).toBeVisible();

    for (const href of NAV_HREFS) {
      const target = `/en${href}`;

      // Return to a known page so each link is clicked from the same state.
      if (!page.url().endsWith(START)) {
        await page.goto(START, { waitUntil: "domcontentloaded" });
      }

      const link = page.locator(`aside a[href="${target}"]`).first();

      if ((await link.count()) === 0) {
        failures.push(`${target}: no sidebar link rendered`);
        continue;
      }

      try {
        await link.click({ timeout: 10_000 });
        await page.waitForURL(`**${target}`, { timeout: 15_000 });
      } catch {
        failures.push(`${target}: click did not navigate (still at ${page.url()})`);
        continue;
      }

      // Destination actually rendered — not an error boundary or a blank shell.
      const body = page.locator("body");
      await expect(body).not.toContainText(/Internal Server Error|Application error|Unhandled Runtime Error/i);
      const heading = page.locator("h1, h2").first();
      if ((await heading.count()) === 0) {
        failures.push(`${target}: navigated but no heading rendered`);
      }
    }

    expect(failures, `sidebar link failures:\n${failures.join("\n")}`).toEqual([]);
  });

  test("sidebar renders translated labels, not raw i18n keys", async ({ page }) => {
    // Guards the reported failure mode: when the route falls back to client
    // rendering the sidebar loses NextIntlClientProvider context. next-intl then
    // surfaces the key path (e.g. "AppShell.apps.dashboard") instead of a label.
    await page.goto(START, { waitUntil: "domcontentloaded" });

    const sidebar = page.locator("aside").first();
    await expect(sidebar).toBeVisible();
    await expect(sidebar).not.toContainText(/AppShell\./);
  });
});
