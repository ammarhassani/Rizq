import type { BenchmarkRow, Collector, RawRecord } from "./types";

/**
 * Collector 1 — curated published references (Qemma 2026, agency rate cards,
 * HRDF/MHRSD stats). provenance='published_ref', confidence=0.60.
 *
 * INPUT CONTRACT (founder supplies an array of these; one per published cell):
 *   {
 *     specialty_id, city_id, experience_tier_id,
 *     project_size?, price_sar,
 *     source_ref   // REQUIRED: the citation URL or document reference
 *   }
 * Rows missing source_ref are rejected — a published reference without a
 * citation is not a published reference (honesty architecture, spec §II.2).
 *
 * NOTE: the actual reference values + URLs are founder-supplied. This adapter
 * is ready; the data lands as a seed run through the run_ingestion RPC once
 * the founder provides the Qemma 2026 / agency rate-card dataset.
 */
export type PublishedRefInput = {
  specialty_id: string;
  city_id: string;
  experience_tier_id: string;
  project_size?: "small" | "medium" | "large" | "enterprise" | null;
  price_sar: number;
  source_ref: string;
};

export function makePublishedRefCollector(
  inputs: PublishedRefInput[],
  capturedAtISO: string
): Collector {
  return {
    id: "published_ref_v1",
    name: "Curated published references",
    provenance: "published_ref",
    confidence: 0.6,
    async fetch(): Promise<RawRecord[]> {
      return inputs as unknown as RawRecord[];
    },
    async normalize(raw: RawRecord[]): Promise<BenchmarkRow[]> {
      return (raw as unknown as PublishedRefInput[])
        .filter(
          (r) => r.price_sar > 0 && !!r.source_ref && r.source_ref.trim().length > 0
        )
        .map((r) => ({
          specialty_id: r.specialty_id,
          city_id: r.city_id,
          experience_tier_id: r.experience_tier_id,
          project_size: r.project_size ?? null,
          price_sar: r.price_sar,
          provenance: "published_ref",
          confidence: 0.6,
          source_ref: r.source_ref,
          captured_at: capturedAtISO,
        }));
    },
  };
}
