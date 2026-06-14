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

  // TODO(i18n): Arabic counted-noun grammar varies by n (سجل واحد / N سجلات / N سجلاً).
  // Current form reads correctly for n≥11; refine pluralization in a later polish pass.
  const ar = `تقدير رِزق بناءً على ${n} سجلاً (${label.ar}) حتى عام ${year}.${widenAr}`;
  const en = `Rizq estimate based on ${n} record(s) (${label.en}) through ${year}.${widenEn}`;
  return { ar, en };
}
