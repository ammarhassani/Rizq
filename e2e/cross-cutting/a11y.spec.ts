import { test, expect } from "../fixtures/auth";
import AxeBuilder from "@axe-core/playwright";
import { gotoReady } from "../fixtures/selectors";

/**
 * Automated accessibility scan per authenticated page. Fails on `critical` violations;
 * reports `serious` ones as attachments for the maturity report. Uses axe-core (WCAG 2 A/AA).
 */
const PAGES = [
  { path: "/en/dashboard", label: "Dashboard" },
  { path: "/en/proposals/new", label: "Proposal new" },
  { path: "/en/clients/new", label: "Client new" },
  { path: "/en/invoices/new", label: "Invoice new" },
  { path: "/en/tool", label: "Pricing tool" },
  { path: "/en/hadaf", label: "HADAF" },
  { path: "/en/rate-calculator", label: "Rate calculator" },
];

for (const { path, label } of PAGES) {
  test(`a11y: ${label}`, async ({ page }, testInfo) => {
    await gotoReady(page, path);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();

    const critical = results.violations.filter((v) => v.impact === "critical");
    const serious = results.violations.filter((v) => v.impact === "serious");
    await testInfo.attach(`axe-${label}.json`, {
      body: JSON.stringify(results.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length })), null, 2),
      contentType: "application/json",
    });

    expect(critical, `critical a11y violations on ${label}: ${critical.map((v) => v.id).join(", ")}`).toHaveLength(0);
    // Serious violations are surfaced but not gating (reported, not failed).
    if (serious.length) console.warn(`[a11y] ${label}: ${serious.length} serious — ${serious.map((v) => v.id).join(", ")}`);
  });
}
