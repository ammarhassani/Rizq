import { PROVENANCE_LABEL, type BenchmarkProvenance } from "./provenance";

export type CitationInput = {
  dominant: BenchmarkProvenance;
  sample_size: number;
  date_range: { earliest: string; latest: string };
  fallback_kind: "none" | "region" | "specialty";
};

/** Builds the bilingual provenance citation string (spec §II.2 honesty layer). */
export function buildCitation(input: CitationInput): { ar: string; en: string } {
  const label = PROVENANCE_LABEL[input.dominant];
  const year = new Date(input.date_range.latest).getUTCFullYear();
  const n = input.sample_size;

  const widenAr =
    input.fallback_kind === "region"
      ? " وُسّع النطاق ليشمل المنطقة."
      : input.fallback_kind === "specialty"
        ? " وُسّع النطاق ليشمل جميع المدن."
        : "";
  const widenEn =
    input.fallback_kind === "region"
      ? " Widened to the whole region."
      : input.fallback_kind === "specialty"
        ? " Widened across all cities."
        : "";

  const ar = `تقدير رِزق بناءً على ${arabicRecordCount(n)} (${label.ar}) حتى عام ${arDigits(year)}.${widenAr}`;
  const en = `Rizq estimate based on ${n} ${n === 1 ? "record" : "records"} (${label.en}) through ${year}.${widenEn}`;
  return { ar, en };
}

/** Arabic-Indic digits, matching every other number the app renders in Arabic. */
export function arDigits(n: number): string {
  return new Intl.NumberFormat("ar-SA", { useGrouping: false }).format(n);
}

/**
 * Arabic counted-noun agreement for "سجل" — singular / dual / plural-of-paucity
 * (3–10) / tamyīz (11+). "5 سجلاً" is simply wrong; a Saudi reader notices.
 */
export function arabicRecordCount(n: number): string {
  if (n === 1) return "سجل واحد";
  if (n === 2) return "سجلين";
  if (n >= 3 && n <= 10) return `${arDigits(n)} سجلات`;
  return `${arDigits(n)} سجلاً`;
}

/**
 * Wraps the benchmark citation for the figure actually quoted. Only a "market"
 * quote may present the benchmark as its source (Constitution Principle I).
 */
export function quoteBasisCitation(
  basis: "market" | "scope" | "client_budget",
  marketCitation: string,
  locale: "ar" | "en"
): string {
  if (basis === "market") return marketCitation;
  if (basis === "scope") {
    return locale === "ar"
      ? `السعر مُعدَّل لحجم النطاق المطلوب، وليس رقمًا من المعيار. مرجع السوق للمشروع الواحد: ${marketCitation}`
      : `Adjusted for the size of this scope — not a benchmark figure. Market reference for a single project: ${marketCitation}`;
  }
  return locale === "ar"
    ? `السعر مبني على الميزانية التي ذكرها العميل. مرجع السوق للمشروع الواحد: ${marketCitation}`
    : `Based on the budget the client stated. Market reference for a single project: ${marketCitation}`;
}
