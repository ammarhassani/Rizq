import { test, expect } from "../fixtures/auth";
import { gotoReady } from "../fixtures/selectors";

/**
 * Arabic pages must never print a not-a-number, and must not mix numeral systems
 * (feature 011, US1 + US8).
 *
 * The defect this guards against shipped, type-checked and unit-tested while reading
 * "بناءً على ليس رقمًا مستقلًا سعوديًا" — "based on NaN" — on the flagship pricing screen,
 * because a display-formatted number was handed to an ICU plural argument: "5" coerces
 * back to a number, "٥" does not. It was invisible in English and invisible to every
 * unit test that asserted on English.
 *
 * `count.test.ts` guards the message catalogue statically. This guards the rendered page,
 * which is where the two locales actually diverge.
 */

const ARABIC_ROUTES = [
  "/ar",
  "/ar/dashboard",
  "/ar/tool",
  "/ar/proposals",
  "/ar/invoices",
  "/ar/clients",
  "/ar/income",
  "/ar/hadaf",
  "/ar/rate-calculator",
  "/ar/methodology",
] as const;

// Every locale-specific rendering of "not a number" we could plausibly print.
const NOT_A_NUMBER = /ليس رقمًا|ليس رقما|\bNaN\b|Infinity|undefined ريال|null ريال/;

for (const route of ARABIC_ROUTES) {
  test(`${route} prints no not-a-number`, async ({ page }) => {
    await gotoReady(page, route);
    const text = await page.locator("body").innerText();
    expect(text, `${route} rendered a not-a-number`).not.toMatch(NOT_A_NUMBER);
  });
}

/**
 * Routes whose visible numbers are the APP's own — counts, percentages, money, steps.
 *
 * Dashboard, proposals and the pricing tool are deliberately absent: they render the
 * freelancer's and their client's own words ("موقع 25 صفحة"), and a title someone typed is
 * not the app mixing numeral systems.
 *
 * A sweep of these found Latin digits in seven places at once — the profile-strength meter
 * and its "+N%" list, the VAT label, the income chart's year, the guided-wizard step
 * counter, the calendar's overflow badge and the catalog tab counts — every one of them a
 * figure the app itself printed.
 */
const APP_CHROME_ROUTES = [
  "/ar/hadaf",
  "/ar/income",
  "/ar/invoices/new",
  "/ar/settings",
  "/ar/settings/profile",
  "/ar/catalog",
  "/ar/calendar",
  "/ar/projects/start",
  "/ar/upgrade",
] as const;

for (const route of APP_CHROME_ROUTES) {
  test(`${route} uses one numeral system for its own figures`, async ({ page }) => {
    await gotoReady(page, route);

    // Walk text nodes rather than innerText: a number glued to its label ("التسليم0") hides
    // from a whitespace split. Latin digits are legitimate in emails, URLs, phone prefixes
    // and reference codes, so nodes carrying Latin letters or identifier punctuation are
    // skipped — the same rule the app's own digit normaliser uses.
    const offenders = await page.evaluate(() => {
      const out: string[] = [];
      const walk = (el: Node) => {
        for (const node of Array.from(el.childNodes)) {
          if (node.nodeType === Node.TEXT_NODE) {
            const text = (node.textContent ?? "").trim();
            if (/[0-9]/.test(text) && !/[A-Za-z@:/._#+\\-]/.test(text)) out.push(text.slice(0, 40));
          } else if (node.nodeType === Node.ELEMENT_NODE) {
            walk(node);
          }
        }
      };
      walk(document.body);
      return [...new Set(out)].slice(0, 10);
    });

    expect(offenders, `Latin digits in Arabic figures: ${offenders.join(" | ")}`).toEqual([]);
  });
}
