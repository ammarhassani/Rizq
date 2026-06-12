import type { BenchmarkRow, Collector, RawRecord } from "./types";

/**
 * Collector 2 — Saudi Open Data (Etimad procurement via open.data.gov.sa).
 * provenance='ingested', confidence=0.40. DEFERRED (spec task 1.9 stretch):
 * the registry row `open_data_etimad` is seeded disabled. Implement
 * fetch()/normalize() when the dataset + license mapping are confirmed with
 * the founder. The interface is in place so resolvePrice never changes.
 */
export function makeOpenDataCollector(): Collector {
  return {
    id: "open_data_etimad",
    name: "Saudi Open Data (Etimad)",
    provenance: "ingested",
    confidence: 0.4,
    async fetch(): Promise<RawRecord[]> {
      throw new Error(
        "open_data_etimad collector not implemented (deferred — spec task 1.9)"
      );
    },
    async normalize(): Promise<BenchmarkRow[]> {
      return [];
    },
  };
}
