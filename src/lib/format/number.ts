/**
 * Counts, formatted for the locale the view is in.
 *
 * Arabic surfaces render "ar-SA" (Arabic-Indic) everywhere else, so a raw `{n}` interpolated
 * straight into JSX shows Latin digits beside them — one view, two numeral systems.
 *
 * Money keeps its own formatters (they carry fraction-digit rules); this is for plain counts.
 */
export function fmtCount(n: number, locale: "ar" | "en"): string {
  return new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-US", {
    maximumFractionDigits: 0,
  }).format(n);
}

/**
 * A money figure, in the view's numerals, keeping its halalas if it has any.
 *
 * An invoice of 9,938.21 SAR used to be announced as ٩٬٩٣٨ in the summary strip and in the
 * share link's preview while the document itself printed ٩٬٩٣٨٫٢١ — the same view stating
 * two different amounts owed, the smaller one to the client. A round figure stays round, so
 * nothing picks up a decorative ٫٠٠.
 */
export function fmtMoney(
  amount: number,
  locale: "ar" | "en",
  /**
   * Override when the figure is mid-animation: a count-up towards a whole number passes
   * through floats, and deciding per frame makes it tick over in halalas and then snap.
   */
  fractionDigits?: 0 | 2,
): string {
  const digits = fractionDigits ?? (Number.isInteger(amount) ? 0 : 2);
  return new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(amount);
}

/**
 * A year, in the view's numerals but WITHOUT thousands grouping.
 *
 * `fmtCount(2026, "ar")` renders "٢٬٠٢٦" — a year is an identifier, not a quantity.
 */
export function fmtYear(year: number, locale: "ar" | "en"): string {
  return new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-US", {
    useGrouping: false,
    maximumFractionDigits: 0,
  }).format(year);
}

const ARABIC_INDIC = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];

/**
 * Rewrite Latin digits in Arabic PROSE as Arabic-Indic, deterministically.
 *
 * Sentences assembled outside a formatter — a model's output, a template built with an en-US
 * formatter — arrive with Latin digits and land beside Arabic-Indic figures. Asking a model
 * nicely is not a guarantee; this is.
 *
 * Digits inside a token that also carries Latin letters or URL/identifier punctuation are left
 * alone, so "STC Pay", "5G", emails, URLs and reference codes survive intact.
 */
export function toArabicIndicDigits(text: string): string {
  return text.replace(/\S+/g, (token) => {
    if (/[A-Za-z@:/\\_#]/.test(token)) return token;
    return (
      token
        .replace(/[0-9]/g, (d) => ARABIC_INDIC[Number(d)])
        // Separators only BETWEEN digits, so a sentence-ending full stop survives.
        .replace(/(?<=[٠-٩]),(?=[٠-٩])/g, "٬")
        .replace(/(?<=[٠-٩])\.(?=[٠-٩])/g, "٫")
    );
  });
}
