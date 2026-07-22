import { test, expect } from "../fixtures/auth";
import { gotoReady, robustFill, pickCombo, finalizeProposal, createClientViaUi } from "../fixtures/selectors";

/**
 * Cross-module golden path (integration proof): a brief becomes a client + an AI proposal, and
 * that proposal then surfaces in the Proposals list AND flips the dashboard out of its
 * first-run empty state (M1 -> M0 integration). Real DeepSeek — slow. Spec-v2 M0/M1 integration.
 */
test.describe("Golden path", () => {
  test.slow();

  test("client -> AI proposal -> proposals list -> dashboard reflects it", async ({ page }) => {
    test.setTimeout(300_000); // real DeepSeek: scope extraction + generation
    const tag = Date.now();
    const clientName = `Golden Client ${tag}`;

    // 1. Client
    await createClientViaUi(page, clientName);

    // 2. Proposal from a brief, attached to that client
    await gotoReady(page, "/en/proposals/new");
    await pickCombo(page, /client/i, { optionName: clientName });
    await robustFill(
      page.getByRole("textbox", { name: /client message/i }),
      "Need a logo + brand guidelines for a Riyadh fintech startup. Send a proposal, ~2 week timeline.",
    );
    await page.getByRole("button", { name: /generate the proposal/i }).click();
    // Skip the AI follow-up questions and generate the artifact (tolerant of AI latency).
    await finalizeProposal(page);

    // 3. Integration: the proposal shows up in the Proposals list.
    await gotoReady(page, "/en/proposals");
    await expect(page.getByText(clientName).first()).toBeVisible({ timeout: 15_000 });

    // 4. Integration: the dashboard is no longer in its first-run empty state.
    await gotoReady(page, "/en/dashboard");
    await expect(page.getByText(/create your first proposal/i)).toHaveCount(0);
  });
});
