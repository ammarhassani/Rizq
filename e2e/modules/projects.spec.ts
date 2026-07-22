import { test, expect } from "../fixtures/auth";
import { gotoReady } from "../fixtures/selectors";

/**
 * Projects (specs 002–005). The list + the "Start a project" chooser render. The 3-way chooser
 * (use existing proposal / create new / set up directly) is the guided-mode entry. Deep
 * create-from-proposal + workspace + GitHub OAuth are covered by the audit. Spec-v2 Projects.
 */
test.describe("Projects", () => {
  test("projects list renders", async ({ page }) => {
    await gotoReady(page, "/en/projects");
    await expect(page.getByRole("main")).toContainText(/project|start|no projects/i, { timeout: 15_000 });
  });

  test("start-a-project chooser renders", async ({ page }) => {
    await gotoReady(page, "/en/projects/start");
    await expect(page.getByRole("main").or(page.getByRole("heading").first()).first()).toBeVisible();
    await expect(page.getByRole("main")).toContainText(/project|proposal|create|set up|start/i, { timeout: 15_000 });
  });
});
