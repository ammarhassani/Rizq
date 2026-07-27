import { describe, it, expect } from "vitest";
import { computeMarketTrend } from "./trend";
import type { AggRow } from "./aggregate";

const NOW = new Date("2026-07-23T00:00:00.000Z");

function row(price: number, iso: string): AggRow {
  return { price_sar: price, provenance: "reasoned", confidence: 1, captured_at: iso };
}

// 5 older rows (~Jan) at ~1000, 5 recent rows (~Jun) at ~1200 → rising ~20%.
const rising: AggRow[] = [
  row(950, "2026-01-05"), row(1000, "2026-01-10"), row(1000, "2026-01-20"),
  row(1050, "2026-02-01"), row(1000, "2026-02-15"),
  row(1180, "2026-06-01"), row(1200, "2026-06-10"), row(1200, "2026-06-20"),
  row(1250, "2026-07-01"), row(1200, "2026-07-10"),
];

describe("computeMarketTrend", () => {
  it("detects a rising market from dated rows", () => {
    const t = computeMarketTrend(rising, NOW);
    expect(t).not.toBeNull();
    expect(t!.direction).toBe("rising");
    expect(t!.percent).toBeGreaterThan(5);
    expect(t!.older_count).toBeGreaterThanOrEqual(3);
    expect(t!.recent_count).toBeGreaterThanOrEqual(3);
  });

  it("detects a falling market (recent lower than older)", () => {
    const falling = rising.map((r) =>
      new Date(r.captured_at) >= new Date("2026-05-01") ? row(800, r.captured_at) : r,
    );
    const t = computeMarketTrend(falling, NOW);
    expect(t!.direction).toBe("falling");
    expect(t!.percent).toBeLessThan(-5);
  });

  it("reads a flat market as stable (within ±5%)", () => {
    const flat = rising.map((r) => row(1000, r.captured_at));
    expect(computeMarketTrend(flat, NOW)!.direction).toBe("stable");
  });

  it("returns null below the sample gate (too few records)", () => {
    expect(computeMarketTrend(rising.slice(0, 5), NOW)).toBeNull();
  });

  it("returns null when all records cluster in a short span", () => {
    const clustered = Array.from({ length: 10 }, (_, i) =>
      row(1000 + i * 10, `2026-07-0${(i % 9) + 1}`),
    );
    expect(computeMarketTrend(clustered, NOW)).toBeNull();
  });

  it("clamps an absurd percent from a thin bad-data outlier (no +9900%)", () => {
    const outlier: AggRow[] = [
      ...Array.from({ length: 5 }, (_, i) => row(10, `2026-01-0${i + 1}`)), // older ~10 SAR
      ...Array.from({ length: 5 }, (_, i) => row(2000, `2026-06-0${i + 1}`)), // recent ~2000
    ];
    const t = computeMarketTrend(outlier, NOW)!;
    expect(t.direction).toBe("rising");
    expect(t.percent).toBeLessThanOrEqual(200); // clamped, not 19900
  });

  it("weights like the band — a low-confidence recent batch doesn't swing the trend", () => {
    // Older: solid reasoned ~1000. Recent: mostly 0-confidence 5000 rows (should carry ~no
    // weight) + a couple reasoned ~1000. A plain-median trend would scream 'rising'; the
    // weighted trend stays ~stable because the 5000 rows are down-weighted.
    const rows: AggRow[] = [
      ...Array.from({ length: 5 }, (_, i) => row(1000, `2026-01-0${i + 1}`)),
      { price_sar: 5000, provenance: "reasoned", confidence: 0, captured_at: "2026-06-05" },
      { price_sar: 5000, provenance: "reasoned", confidence: 0, captured_at: "2026-06-06" },
      { price_sar: 1000, provenance: "reasoned", confidence: 1, captured_at: "2026-06-07" },
      { price_sar: 1000, provenance: "reasoned", confidence: 1, captured_at: "2026-06-08" },
    ];
    // Filtered rows must still clear the sample gate (8+ usable). confidence-0 rows still
    // count as rows here (trend filters only on price/captured_at), so sample_size = 9.
    const t = computeMarketTrend(rows, NOW);
    expect(t).not.toBeNull();
    expect(t!.direction).toBe("stable");
  });

  it("returns null when one half is empty (no support both sides)", () => {
    // 9 rows in Jan, 1 in Jun → recent bucket under MIN_BUCKET.
    const lopsided: AggRow[] = [
      ...Array.from({ length: 9 }, (_, i) => row(1000, `2026-01-0${i + 1}`)),
      row(1400, "2026-06-15"),
    ];
    expect(computeMarketTrend(lopsided, NOW)).toBeNull();
  });
});

describe("trend scope — widen the rows, never the claim", () => {
  it("defaults to the exact market when no scope is given", () => {
    expect(computeMarketTrend(rising, NOW)!.scope).toBe("exact");
  });

  it("carries the scope it was computed at, so the UI can name that market", () => {
    for (const scope of ["exact", "region", "national"] as const) {
      expect(computeMarketTrend(rising, NOW, scope)!.scope).toBe(scope);
    }
  });

  it("keeps the gates where they are — a wider row set is the answer, not a lower bar", () => {
    // The trend never appeared in production because no (specialty, city, tier) cell holds
    // 8 dated rows; the largest holds 6. The fix widens the ROWS (resolveTrend falls back to
    // the national set) rather than accepting a direction drawn from 6 clustered records.
    // If someone later lowers MIN_TREND_SAMPLE to "make the trend show up", this fails.
    const sixRows: AggRow[] = [
      row(1000, "2026-01-05"), row(1000, "2026-01-10"), row(1000, "2026-02-01"),
      row(1200, "2026-06-01"), row(1200, "2026-06-10"), row(1200, "2026-07-01"),
    ];
    expect(computeMarketTrend(sixRows, NOW, "national")).toBeNull();
  });
});

describe("comparable basis — a change of subject is not a market move", () => {
  const sized = (price: number, iso: string, size: string | null): AggRow => ({
    price_sar: price, provenance: "reasoned", confidence: 1, captured_at: iso, project_size: size,
  });

  it("refuses a direction when the halves price different kinds of work", () => {
    // The shape found in production for graphic-design/junior: sized small-project records
    // early, then one batch of unsized whole-project records. Comparing them reported a
    // +733% "market rise" (displayed clamped to +200%) and the AI narrated it as real.
    const mixed: AggRow[] = [
      sized(490, "2025-11-15", "small"), sized(420, "2026-01-10", "small"),
      sized(610, "2026-01-20", "medium"), sized(460, "2026-02-05", "large"),
      ...Array.from({ length: 8 }, (_, i) => sized(2550 + i * 100, `2026-06-1${i % 10}`, null)),
    ];
    expect(computeMarketTrend(mixed, NOW, "national")).toBeNull();
  });

  it("still reports a direction when both halves price the same kind of work", () => {
    const consistent: AggRow[] = [
      ...Array.from({ length: 5 }, (_, i) => sized(1000, `2026-01-0${i + 1}`, "medium")),
      ...Array.from({ length: 5 }, (_, i) => sized(1300, `2026-06-0${i + 1}`, "medium")),
    ];
    const t = computeMarketTrend(consistent, NOW, "national");
    expect(t).not.toBeNull();
    expect(t!.direction).toBe("rising");
  });

  it("marks a clamped move so the UI says 'over N%' instead of stating the clamp as fact", () => {
    const explosive: AggRow[] = [
      ...Array.from({ length: 5 }, (_, i) => sized(100, `2026-01-0${i + 1}`, "medium")),
      ...Array.from({ length: 5 }, (_, i) => sized(5000, `2026-06-0${i + 1}`, "medium")),
    ];
    const t = computeMarketTrend(explosive, NOW)!;
    expect(t.clamped).toBe(true);
    expect(t.percent).toBe(200);
  });

  it("does not mark an unclamped move", () => {
    expect(computeMarketTrend(rising, NOW)!.clamped).toBe(false);
  });
});
