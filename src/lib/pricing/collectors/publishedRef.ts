import { PROJECT_HOURS, type ProjectSize } from "../contribution";
import { sourceConfidence } from "../sourceConfidence";
import type { BenchmarkRow, Collector, RawRecord } from "./types";

/**
 * Purchasing-power bridge for foreign rate reports.
 *
 * Every credible freelance rate report is US/UK. Converting $88/hr at the SAMA peg
 * (3.75) would say a Saudi client pays 330 SAR/hr for work a US client pays $88 for,
 * which is a claim about exchange rates, not about what the work is worth here.
 * The World Bank's PPP conversion factor is the standard, citable bridge — and unlike
 * a factor we invent, it has a publisher, a year, and a revision history.
 *
 * Source: World Bank, "PPP conversion factor, GDP (LCU per international $)"
 * (indicator PA.NUS.PPP), Saudi Arabia, 2024. Prior years: 1.89 (2023), 2.01 (2022).
 * Refresh annually — the refresh agent tracks this alongside the rate reports.
 */
export const SAR_PER_INTERNATIONAL_DOLLAR = 1.85;
export const PPP_SOURCE_REF =
  "World Bank PA.NUS.PPP (PPP conversion factor, GDP), Saudi Arabia 2024 = 1.85";

/**
 * A published USD hourly rate → a SAR price for one project size.
 * No overhead or freelance premium here: unlike a salary, a published freelance rate
 * already carries both.
 */
export function usdHourlyToSarProject(usdHourly: number, size: ProjectSize): number {
  return Math.round(usdHourly * SAR_PER_INTERNATIONAL_DOLLAR * PROJECT_HOURS[size]);
}

/**
 * Collector 1 — curated published references (Qemma 2026, agency rate cards,
 * HRDF/MHRSD stats). provenance='published_ref'; confidence is DERIVED from the
 * sample the publisher states, never hand-picked (feature 012).
 *
 * INPUT CONTRACT (founder supplies an array of these; one per published cell):
 *   {
 *     specialty_id, city_id, experience_tier_id,
 *     project_size?, price_sar,
 *     source_ref,       // REQUIRED: the citation URL or document reference
 *     published_sample  // observations behind THIS figure; omit only if none is stated
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
  /**
   * Observations the publisher states stand behind this figure. Pass the discipline-level
   * figure where the source gives one (ProCopywriters: 220 copywriters, not 298 total) and
   * the conservative end of any approximation ("over 1,100" -> 1100). Omit only when the
   * publisher genuinely states no sample.
   */
  published_sample?: number | null;
};

export function makePublishedRefCollector(
  inputs: PublishedRefInput[],
  capturedAtISO: string
): Collector {
  return {
    id: "published_ref_v1",
    name: "Curated published references",
    provenance: "published_ref",
    // Registry-level nominal value only, matching collector_registry.default_confidence.
    // Rows do NOT use it — each derives its own from the sample its publisher stated.
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
          provenance: "published_ref" as const,
          published_sample: r.published_sample ?? null,
          // Derived, not chosen. A flat 0.6 here is what made a 182,000-point survey and a
          // 298-respondent survey weigh the same.
          confidence: sourceConfidence(r.published_sample),
          source_ref: r.source_ref,
          captured_at: capturedAtISO,
        }));
    },
  };
}
