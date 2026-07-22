import { test as base, expect, type Page } from "@playwright/test";

/**
 * Shared test fixtures. The default page is authenticated as the MAIN disposable user
 * (storageState set in playwright.config `use`). `isolationPage` is authenticated as the
 * second, independent user — used to attempt cross-tenant reads (must fail).
 *
 * Specs needing an anonymous context (auth-flows, share-tokens) do:
 *   test.use({ storageState: { cookies: [], origins: [] } });
 */

type Fixtures = {
  isolationPage: Page;
};

export const test = base.extend<Fixtures>({
  isolationPage: async ({ browser }, use) => {
    const context = await browser.newContext({ storageState: "e2e/.auth/isolation.json" });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },
});

export { expect };

/** Anonymous (logged-out) context override for a whole spec file or describe block. */
export const ANON_STATE = { cookies: [], origins: [] } as const;
