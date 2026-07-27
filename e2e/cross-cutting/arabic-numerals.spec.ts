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

// Money and counts live on these three. HADAF's headline read "شهر 1 من ٣" — one numeral
// system beside the other in a single sentence — because next-intl formats a raw number
// with plain "ar", which CLDR resolves to Latin digits.
for (const route of ["/ar/dashboard", "/ar/hadaf", "/ar/income"] as const) {
  test(`${route} uses one numeral system for its own figures`, async ({ page }) => {
    await gotoReady(page, route);

    // Latin digits are legitimate inside emails, URLs, brand names and reference codes, so
    // only tokens free of Latin letters and identifier punctuation are examined — the same
    // rule the app's own digit normaliser uses.
    const offenders = await page.evaluate(() => {
      const text = (document.body as HTMLElement).innerText;
      return text
        .split(/\s+/)
        .filter((token) => /[0-9]/.test(token))
        .filter((token) => !/[A-Za-z@:/._#\\-]/.test(token))
        .slice(0, 10);
    });

    expect(offenders, `Latin digits in Arabic figures: ${offenders.join(", ")}`).toEqual([]);
  });
}
