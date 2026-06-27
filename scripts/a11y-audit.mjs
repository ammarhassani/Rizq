/**
 * a11y-audit — drive Rizq's key surfaces (logged in) and run axe-core against
 * each, in Arabic (RTL). Reports WCAG violations, with color-contrast called out
 * (the gold-on-cream / muted-text risk from the UI/UX audit).
 *
 * Usage: node scripts/a11y-audit.mjs            (uses defaults below)
 *        BASE=http://localhost:3000 EMAIL=.. PASSWORD=.. node scripts/a11y-audit.mjs
 *
 * Requires the dev server running. Dev deps: playwright, @axe-core/playwright.
 */
import { chromium } from "playwright";
import { AxeBuilder } from "@axe-core/playwright";

const BASE = process.env.BASE || "http://localhost:3000";
const EMAIL = process.env.EMAIL || "izxfantasticxzi@gmail.com";
const PASSWORD = process.env.PASSWORD || "iAmAmmar123@*";
const PROJECT_ID = process.env.PROJECT_ID || "74d9e1ff-d58e-4e0c-9a7e-3e6679c1b1d0";

const PAGES = [
  ["/ar/dashboard", "dashboard"],
  ["/ar/projects", "projects"],
  [`/ar/projects/${PROJECT_ID}`, "project-overview"],
  ["/ar/income", "income"],
  ["/ar/proposals", "proposals"],
  ["/ar/invoices", "invoices"],
  ["/ar/clients", "clients"],
];

const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1366, height: 1000 } })).newPage();
page.setDefaultTimeout(20000);

async function login() {
  for (let i = 0; i < 3; i++) {
    await page.goto(`${BASE}/en/login`, { waitUntil: "domcontentloaded" });
    await page.locator('input[type=email]').fill(EMAIL);
    await page.locator('input[type=password]').fill(PASSWORD);
    await page.locator('button[type=submit]').first().click();
    try { await page.waitForURL((u) => u.toString().includes("/dashboard"), { timeout: 12000 }); return true; } catch {}
  }
  return false;
}

const totals = {};
console.log("login:", await login());
for (const [url, name] of PAGES) {
  try {
    await page.goto(`${BASE}${url}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1500);
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    const byId = {};
    for (const v of results.violations) byId[v.id] = (byId[v.id] || 0) + v.nodes.length;
    for (const id in byId) totals[id] = (totals[id] || 0) + byId[id];
    const summary = results.violations
      .map((v) => `${v.impact}:${v.id}(${v.nodes.length})`)
      .join("  ") || "clean";
    console.log(`\n## ${name} ${url}\n  ${summary}`);
    // Print first node target + the failing color pair for contrast issues.
    for (const v of results.violations) {
      if (v.id === "color-contrast") {
        for (const n of v.nodes.slice(0, 3)) {
          console.log(`   contrast: ${n.target}  ${(n.any?.[0]?.message || "").replace(/\s+/g, " ").slice(0, 120)}`);
        }
      }
    }
  } catch (e) {
    console.log(`\n## ${name} ${url}\n  ERROR ${e.message.split("\n")[0]}`);
  }
}
console.log("\n=== TOTAL violations by rule ===");
for (const id of Object.keys(totals).sort((a, b) => totals[b] - totals[a])) console.log(`  ${id}: ${totals[id]}`);
await browser.close();
