import { PROJECT_HOURS, type ProjectSize } from "../contribution";
import { sourceConfidence } from "../sourceConfidence";
import type { BenchmarkRow, Collector, RawRecord } from "./types";

/**
 * Collector 2 — Saudi open government wage data (`ingested`, confidence 0.40).
 *
 * GASTAT publishes average monthly WAGES for paid employees. Rizq prices freelance
 * PROJECTS. Those are not the same number, and pretending otherwise is the failure
 * this collector exists to avoid — so the bridge between them is an explicit,
 * published model rather than a quiet fudge:
 *
 *   hourly   = (monthly_wage × 12) / BILLABLE_HOURS_PER_YEAR × OVERHEAD × PREMIUM
 *   project  = hourly × PROJECT_HOURS[project_size]
 *
 * Every constant below is an assumption, not a measurement. Each emitted row carries
 * the wage it came from, the constants applied, and the assumed project hours in
 * `notes`, so a reader can disagree with the model without having to
 * reverse-engineer it. Weight (0.4) and confidence (0.4) both sit below
 * `published_ref` because a converted wage is weaker evidence than a quoted rate.
 *
 * ponytail: constants are national and flat — no city cost-of-living factor, no tier
 * scaling. The caller decides which (specialty, city, tier) cells a wage applies to;
 * this module never fans one national figure across a grid on its own. Add scaling
 * here only once real submitted data exists to calibrate it against.
 *
 * NOT WIRED YET: the registry row `open_data_etimad` is a different source (Etimad
 * procurement) and stays disabled. Ingesting these rows needs a registry row of its
 * own plus a real GASTAT export — open.data.gov.sa blocks automated fetching, so the
 * CSV is downloaded by hand and passed in here.
 */

/** Billable hours a freelancer actually invoices in a year (not the 2,080 a salary buys). */
export const BILLABLE_HOURS_PER_YEAR = 1250;
/** Unpaid leave, GOSI, equipment, software, admin — costs an employer would carry. */
export const OVERHEAD_MULTIPLIER = 1.25;
/** Risk, no job security, unpaid client acquisition. */
export const FREELANCE_PREMIUM = 1.3;
export { PROJECT_HOURS };

/** An average monthly wage, already mapped by the caller to the cell it describes. */
export type WageObservation = {
  specialty_id: string;
  city_id: string;
  experience_tier_id: string;
  project_size: ProjectSize;
  /** Average monthly wage in SAR, as published. */
  monthly_wage_sar: number;
  /** The occupation label the wage was published under — kept for auditability. */
  occupation_label: string;
  /** REQUIRED: dataset URL or publication reference. No citation, no row. */
  source_ref: string;
  /**
   * Observations the publishing authority states stand behind this wage figure — a labour
   * force survey states its base. Omit only when the release genuinely gives none.
   */
  published_sample?: number | null;
};

/** Monthly employment wage → freelance hourly rate, via the published model above. */
export function wageToHourlyRate(monthlyWageSar: number): number {
  const annual = monthlyWageSar * 12;
  return (annual / BILLABLE_HOURS_PER_YEAR) * OVERHEAD_MULTIPLIER * FREELANCE_PREMIUM;
}

/** Freelance hourly rate → a project price for one size bucket. */
export function wageToProjectRate(monthlyWageSar: number, size: ProjectSize): number {
  return Math.round(wageToHourlyRate(monthlyWageSar) * PROJECT_HOURS[size]);
}

export function makeOpenDataCollector(
  inputs: WageObservation[],
  capturedAtISO: string
): Collector {
  return {
    id: "open_data_gastat_wages",
    name: "Saudi open government wage data (GASTAT)",
    provenance: "ingested",
    // Registry-level nominal value only. Rows derive their own from the published survey base.
    confidence: 0.4,
    async fetch(): Promise<RawRecord[]> {
      return inputs as unknown as RawRecord[];
    },
    async normalize(raw: RawRecord[]): Promise<BenchmarkRow[]> {
      return (raw as unknown as WageObservation[])
        .filter(
          (r) =>
            Number.isFinite(r.monthly_wage_sar) &&
            r.monthly_wage_sar > 0 &&
            !!r.source_ref &&
            r.source_ref.trim().length > 0
        )
        .map((r) => {
          const hours = PROJECT_HOURS[r.project_size];
          const hourly = wageToHourlyRate(r.monthly_wage_sar);
          return {
            specialty_id: r.specialty_id,
            city_id: r.city_id,
            experience_tier_id: r.experience_tier_id,
            project_size: r.project_size,
            price_sar: Math.round(hourly * hours),
            provenance: "ingested" as const,
            published_sample: r.published_sample ?? null,
            // Derived from the survey base the authority published, not a flat constant.
            confidence: sourceConfidence(r.published_sample),
            source_ref: r.source_ref,
            captured_at: capturedAtISO,
            // `notes` is the only free-text field run_ingestion persists, so the whole
            // derivation lives here — a price nobody can retrace is not a cited price.
            notes:
              `Converted from an average monthly wage of ${r.monthly_wage_sar} SAR ` +
              `(${r.occupation_label}): ×12 ÷ ${BILLABLE_HOURS_PER_YEAR} billable h/yr ` +
              `× ${OVERHEAD_MULTIPLIER} overhead × ${FREELANCE_PREMIUM} freelance premium ` +
              `= ${Math.round(hourly)} SAR/h × ${hours} h assumed for a ${r.project_size} project.`,
          };
        });
    },
  };
}
