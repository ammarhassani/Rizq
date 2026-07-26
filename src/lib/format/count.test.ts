import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { createTranslator } from "next-intl";
import ar from "../../../messages/ar.json";
import en from "../../../messages/en.json";

/**
 * Two rules govern every counted sentence in this app, and breaking either one is visible
 * only in Arabic:
 *
 * 1. The ICU plural argument must be a RAW NUMBER. A pre-formatted "٥" is not numeric, so
 *    ICU falls through to `other` — and with `#` in that branch it rendered
 *    Intl.NumberFormat("ar").format(NaN) = "ليس رقمًا" on the freelancer's screen.
 *
 * 2. The DIGITS must come from a `{count}` the call site formatted, never from ICU's `#`.
 *    CLDR resolves plain "ar" to Latin digits, while the rest of this app formats "ar-SA"
 *    (Arabic-Indic) — so `#` printed "5" in the same sentence as "٥".
 */

const CATALOGUES = { ar, en } as const;
const COUNTS = [0, 1, 2, 3, 5, 11];

/** How the app formats numbers: ar-SA, not plain ar. */
const appFmt = (locale: "ar" | "en", n: number) =>
  new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-US").format(n);

/**
 * Renderings a broken plural argument produces. Matched without diacritics — ICU emits the
 * tanween as a combining mark whose ordering does not survive a naive string compare.
 */
const NOT_A_NUMBER = [/ليس\s*رقم/, /غير\s*رقم/, /NaN/];

describe("counted sentences render a real number in the view's own numerals", () => {
  for (const locale of ["ar", "en"] as const) {
    const t = createTranslator({
      locale,
      messages: CATALOGUES[locale],
      namespace: "Tool.result",
    });

    for (const n of COUNTS) {
      it(`${locale}: Tool.result.sampleSize with n=${n}`, () => {
        const rendered = t("sampleSize", { n, count: appFmt(locale, n) });

        for (const bad of NOT_A_NUMBER) {
          expect(rendered, `${locale} n=${n}`).not.toMatch(bad);
        }
        // Above two the count is shown as digits; 0/1/2 are spelled out in Arabic.
        if (n > 2) {
          expect(rendered, `${locale} n=${n}`).toContain(appFmt(locale, n));
        }
        if (locale === "ar" && n > 2) {
          // FR-021: one numeral system per view. Arabic-Indic digits above, so no Latin
          // digit may appear beside them.
          expect(rendered, `ar n=${n} mixes numeral systems: ${rendered}`).not.toMatch(/[0-9]/);
        }
      });
    }
  }

  it("ar: keeps a distinct branch per plural category in use", () => {
    const t = createTranslator({ locale: "ar", messages: ar, namespace: "Tool.result" });
    // one / two / few all differ in Arabic; a message collapsed to `other` would render the
    // same sentence for 1, 2 and 3.
    const rendered = [1, 2, 3].map((n) => t("sampleSize", { n, count: appFmt("ar", n) }));
    expect(new Set(rendered).size).toBe(3);
  });

  it("ar: a pre-formatted plural argument loses the category (regression witness)", () => {
    const t = createTranslator({ locale: "ar", messages: ar, namespace: "Tool.result" });
    // What a browser's Intl.NumberFormat("ar-SA") hands back — non-numeric to ICU, so the
    // dual (٢) form silently becomes the `other` form. This is why the guard below exists.
    const broken = t("sampleSize", { n: "٢" as unknown as number, count: "٢" });
    const correct = t("sampleSize", { n: 2, count: "٢" });
    expect(broken).not.toBe(correct);
  });

  it("both catalogues describe records, not surveyed freelancers (FR-002)", () => {
    // The citation under this sentence says "records (published references)". The sentence
    // above it may not claim a survey of people that Rizq does not run.
    expect(en.Tool.result.sampleSize).not.toMatch(/freelancer/i);
    expect(ar.Tool.result.sampleSize).not.toMatch(/مستقل/);
  });
});

// ---------------------------------------------------------------------------
// Static guards over the catalogues + every call site.
// ---------------------------------------------------------------------------

type PluralMessage = { key: string; arg: string; message: string; locale: string };

function collectPlurals(
  node: unknown,
  locale: string,
  out: PluralMessage[] = [],
  key = "",
): PluralMessage[] {
  if (typeof node === "string") {
    const match = node.match(/\{\s*(\w+)\s*,\s*plural\s*,/);
    if (match) out.push({ key, arg: match[1], message: node, locale });
    return out;
  }
  if (node && typeof node === "object") {
    for (const [k, v] of Object.entries(node)) collectPlurals(v, locale, out, k);
  }
  return out;
}

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) sourceFiles(full, out);
    else if (/\.tsx?$/.test(entry.name) && !/\.(test|spec)\.tsx?$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

describe("every ICU plural message is safe by construction", () => {
  const srcRoot = path.resolve(__dirname, "../..");
  const files = sourceFiles(srcRoot).map((file) => ({
    file,
    text: readFileSync(file, "utf8"),
  }));

  const plurals = [...collectPlurals(ar, "ar"), ...collectPlurals(en, "en")];
  const byKey = new Map<string, PluralMessage>();
  for (const p of plurals) if (!byKey.has(p.key)) byKey.set(p.key, p);

  it("finds the plural messages to guard", () => {
    expect(byKey.size).toBeGreaterThan(0);
  });

  it("no plural message prints ICU's own `#`", () => {
    const offenders = plurals
      .filter((p) => p.message.includes("#"))
      .map((p) => `${p.locale}.${p.key}`);
    expect(
      offenders,
      `these plural messages render ICU's # (Latin digits in an Arabic view): ${offenders.join(", ")}`,
    ).toEqual([]);
  });

  for (const { key, arg } of byKey.values()) {
    it(`${key}({${arg}}) is called with a number`, () => {
      // Match `t("key", { ... })` — the argument object up to the first closing brace.
      const callSite = new RegExp(
        `["'\`]${key}["'\`]\\s*,\\s*\\{([^{}]*(?:\\{[^{}]*\\}[^{}]*)*)\\}`,
        "g",
      );
      let found = 0;
      for (const { file, text } of files) {
        for (const match of text.matchAll(callSite)) {
          const args = match[1];
          const value = args.match(new RegExp(`\\b${arg}\\s*:\\s*([^,}]+)`))?.[1];
          if (value === undefined) continue;
          found += 1;
          expect(
            /\.format\s*\(|\bfmtInt\s*\(|\bfmtMoney\s*\(|\bfmtSAR\s*\(|\bfmtPrice\s*\(|\bfmtCount\s*\(|\bfmtNumber\s*\(/.test(
              value,
            ),
            `${path.relative(srcRoot, file)} passes a formatted string as "${arg}" to "${key}": ${value.trim()}`,
          ).toBe(false);
          expect(
            /^\s*["'`]/.test(value),
            `${path.relative(srcRoot, file)} passes a string literal as "${arg}" to "${key}": ${value.trim()}`,
          ).toBe(false);
        }
      }
      expect(
        found,
        `no call site passes "${arg}" to the plural message "${key}"`,
      ).toBeGreaterThan(0);
    });
  }
});
