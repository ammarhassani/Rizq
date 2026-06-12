/** Provenance taxonomy — mirrors the DB enum public.benchmark_provenance. */
export type BenchmarkProvenance =
  | "published_ref"
  | "ingested"
  | "partner"
  | "submitted"
  | "reasoned"
  | "founder";

/** Loosely-typed raw record straight from a source, pre-normalization. */
export type RawRecord = Record<string, unknown>;

/** Normalized row, ready to hand to the run_ingestion RPC. */
export type BenchmarkRow = {
  specialty_id: string;
  city_id: string;
  experience_tier_id: string;
  project_size?: "small" | "medium" | "large" | "enterprise" | null;
  price_sar: number;
  provenance: BenchmarkProvenance;
  confidence: number; // 0..1
  source_ref: string; // URL / citation / "model#prompthash"
  captured_at: string; // ISO
  notes?: string;
};

/**
 * Pluggable data source. Adding a source = implement this + INSERT a
 * collector_registry row. resolvePrice never changes (spec §M4.1, §M4.5).
 */
export interface Collector {
  id: string;
  name: string;
  provenance: BenchmarkProvenance;
  confidence: number;
  fetch(): Promise<RawRecord[]>;
  normalize(raw: RawRecord[]): Promise<BenchmarkRow[]>;
  validate?(rows: BenchmarkRow[]): Promise<BenchmarkRow[]>;
}
