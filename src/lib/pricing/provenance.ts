import type { BenchmarkProvenance } from "./collectors/types";

export type { BenchmarkProvenance };

/** Weight of each provenance in resolvePrice (spec §M4.3 + founder class). */
export const PROVENANCE_WEIGHT: Record<BenchmarkProvenance, number> = {
  published_ref: 0.6,
  ingested: 0.4,
  partner: 0.5,
  submitted: 0.5,
  reasoned: 0.2,
  founder: 0.3,
};

/** Bilingual human labels used in honesty citations. */
export const PROVENANCE_LABEL: Record<BenchmarkProvenance, { ar: string; en: string }> = {
  published_ref: { ar: "مراجع منشورة", en: "published references" },
  ingested: { ar: "بيانات حكومية مفتوحة", en: "open government data" },
  partner: { ar: "بيانات شركاء", en: "partner data" },
  // NOT "verified": since the proposal path opened, this covers both a paid invoice (0.70)
  // and a finalized proposal nobody has yet agreed to (0.40). Calling an ask "verified"
  // would be the overstatement the whole provenance layer exists to prevent.
  submitted: { ar: "مساهمات من مستقلين سعوديين", en: "Saudi freelancer submissions" },
  reasoned: { ar: "تقدير رِزق المبني على مراجع منشورة", en: "Rizq estimate anchored to published references" },
  founder: { ar: "تقدير تحريري من رِزق", en: "Rizq editorial estimate" },
};

export function provenanceWeight(p: BenchmarkProvenance): number {
  return PROVENANCE_WEIGHT[p] ?? 0.3;
}
