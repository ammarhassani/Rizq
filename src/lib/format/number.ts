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
