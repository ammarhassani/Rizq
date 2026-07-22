import { test, expect } from "../fixtures/auth";
import { createClientViaUi } from "../fixtures/selectors";
import { signedInClient } from "../fixtures/supabaseClient";

/**
 * Tenant isolation (RLS). The main user creates a private record; the isolation user must not
 * be able to read it, verified BOTH at the DB layer (direct anon-key query under the other
 * user's session) AND at the UI layer (visiting the record's URL). Highest-severity class:
 * a failure here is a cross-tenant data leak. Constitution: RLS on every table.
 */
test.describe("RLS tenant isolation", () => {
  test("a client owned by user A is invisible to user B (DB + UI)", async ({ page, isolationPage }) => {
    // 1. Main user creates a client via the UI; capture its id from the URL.
    const name = `RLS Secret ${Date.now()}`;
    const clientId = await createClientViaUi(page, name);

    // 2. DB layer: main sees the row, isolation does not (RLS filters it out).
    const main = await signedInClient("main");
    const iso = await signedInClient("isolation");
    const mainRead = await main.client.from("clients").select("id,name").eq("id", clientId);
    const isoRead = await iso.client.from("clients").select("id,name").eq("id", clientId);
    expect(mainRead.data?.length, "owner can read own client").toBe(1);
    expect(isoRead.data ?? [], "other user cannot read it via RLS").toHaveLength(0);

    // 3. UI layer: isolation user visiting the record URL must not see the secret name.
    await isolationPage.goto(`/en/clients/${clientId}`, { waitUntil: "domcontentloaded" });
    await expect(isolationPage.locator("body")).not.toContainText(name, { timeout: 10_000 });
  });

  test("user B's client list does not contain user A's clients", async () => {
    const main = await signedInClient("main");
    const iso = await signedInClient("isolation");
    const mainRows = await main.client.from("clients").select("user_id").limit(50);
    const isoRows = await iso.client.from("clients").select("user_id").limit(50);
    // Every row each user sees is their own.
    for (const r of mainRows.data ?? []) expect(r.user_id).toBe(main.userId);
    for (const r of isoRows.data ?? []) expect(r.user_id).toBe(iso.userId);
  });
});
