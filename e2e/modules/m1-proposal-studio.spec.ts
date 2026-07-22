import { test, expect } from "../fixtures/auth";
import { gotoReady, robustFill, pickCombo, finalizeProposal, createClientViaUi } from "../fixtures/selectors";

/**
 * M1 — Proposal Studio (the wedge). Real DeepSeek generation from a brief, then assert the
 * generated proposal shows a price AND its provenance/AI labeling (Constitution Principle I).
 * Generation is slow (~30-90s) — this spec gets a long timeout and tolerates AI latency, but
 * treats a missing price or missing provenance as a real (honesty) failure. Spec-v2 M1.
 */
test.describe("M1 Proposal Studio", () => {
  test.slow(); // triples the timeout for the AI round-trip

  test("proposals/new form requires a client and renders the brief inputs", async ({ page }) => {
    await gotoReady(page, "/en/proposals/new");
    await expect(page.getByRole("heading", { name: /generate your proposal/i })).toBeVisible();
    await expect(page.getByRole("textbox", { name: /client message/i })).toBeVisible();
    // Submitting with no client surfaces the guard.
    await page.getByRole("button", { name: /generate the proposal/i }).click();
    await expect(page.getByRole("alert").filter({ hasText: /client/i })).toBeVisible({ timeout: 10_000 });
  });

  test("generate a proposal from a brief and verify price + provenance", async ({ page }) => {
    test.setTimeout(300_000); // real DeepSeek: scope extraction + generation
    // Prerequisite: a client to attach the proposal to.
    const clientName = `E2E Proposal Client ${Date.now()}`;
    await createClientViaUi(page, clientName);

    await gotoReady(page, "/en/proposals/new");
    await pickCombo(page, /client/i, { optionName: clientName });

    await robustFill(
      page.getByRole("textbox", { name: /client message/i }),
      "I need a full brand identity for my new specialty coffee shop in Riyadh: logo, palette, typography, and social templates. Timeline ~3 weeks.",
    );
    // Stage 1: scope extraction -> AI follow-up questions ("Rizq Analysis").
    await page.getByRole("button", { name: /generate the proposal/i }).click();
    // Stage 2: skip the follow-ups and generate the artifact (tolerant of AI latency).
    await finalizeProposal(page);
    await page.waitForLoadState("networkidle").catch(() => {});

    const body = page.locator("body");
    // A price/number in SAR should appear.
    await expect(body).toContainText(/SAR|ر\.?س|ريال|\d{3,}/i, { timeout: 20_000 });
    // Honesty (Principle I): the AI/pricing surface should label its source. This asserts the
    // constitutional requirement; a failure here is a real honesty finding, not a flake.
    await expect(
      body.filter({ hasText: /Rizq Insight|تحليل رِزق|based on|provenance|records|reasoned|market/i }),
    ).toBeVisible({ timeout: 15_000 });
  });
});
