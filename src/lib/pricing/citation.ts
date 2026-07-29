import { PROVENANCE_LABEL, type BenchmarkProvenance } from "./provenance";

export type CitationInput = {
  dominant: BenchmarkProvenance;
  sample_size: number;
  /**
   * Distinct citations behind the rows (aggregate.source_count). Named separately
   * from sample_size because they are routinely different: the published-reference
   * seed stores one document as a min/median/max triple, so "3 records" has meant
   * one source since the day it was loaded. Stating the row count alone reads as
   * three independent findings agreeing — a claim nobody made and nobody checked.
   */
  source_count: number;
  date_range: { earliest: string; latest: string };
  fallback_kind: "none" | "size";
};

/** Builds the bilingual provenance citation string (spec §II.2 honesty layer). */
export function buildCitation(input: CitationInput): { ar: string; en: string } {
  const label = PROVENANCE_LABEL[input.dominant];
  const year = new Date(input.date_range.latest).getUTCFullYear();
  const n = input.sample_size;

  // City widening no longer exists — prices are national (feature 013). The only remaining
  // fallback is a widened project size, and it is still worth naming: a band drawn from every
  // size is answering a slightly different question than the one asked.
  const widenAr = input.fallback_kind === "size" ? " وُسّع النطاق ليشمل كل أحجام المشاريع." : "";
  const widenEn = input.fallback_kind === "size" ? " Widened across all project sizes." : "";

  const m = input.source_count;

  const ar = `تقدير رِزق بناءً على ${arabicRecordCount(n)} من ${arabicSourceCount(m)} (${label.ar}) حتى عام ${arDigits(year)}.${widenAr}`;
  const en = `Rizq estimate based on ${n} ${n === 1 ? "record" : "records"} from ${m} ${m === 1 ? "source" : "sources"} (${label.en}) through ${year}.${widenEn}`;
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

/** Same counted-noun agreement for "مصدر" — a Saudi reader notices "٣ مصدر" too. */
export function arabicSourceCount(n: number): string {
  if (n === 1) return "مصدر واحد";
  if (n === 2) return "مصدرين";
  if (n >= 3 && n <= 10) return `${arDigits(n)} مصادر`;
  return `${arDigits(n)} مصدرًا`;
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
