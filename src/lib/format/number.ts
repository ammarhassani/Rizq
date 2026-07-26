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
