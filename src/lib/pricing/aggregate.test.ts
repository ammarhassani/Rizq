import { describe, it, expect } from "vitest";
import { aggregate, type AggRow } from "./aggregate";
import type { BenchmarkProvenance } from "./collectors/types";

const NOW = new Date("2026-06-12T00:00:00Z");

function row(
  price: number,
  provenance: BenchmarkProvenance,
  confidence: number,
  ageMonths = 1
): AggRow {
  const captured = new Date(NOW.getTime() - ageMonths * 30.4375 * 86400000).toISOString();
  return { price_sar: price, provenance, confidence, captured_at: captured };
}

describe("aggregate", () => {
  it("returns null for an empty set", () => {
    expect(aggregate([], NOW)).toBeNull();
  });

  it("produces ordered min ≤ anchor ≤ max and a sample size", () => {
    const rows = [800, 900, 1000, 1100, 1200, 1400, 1500].map((p) =>
      row(p, "founder", 0.3)
    );
    const out = aggregate(rows, NOW)!;
    expect(out.min).toBeLessThanOrEqual(out.anchor);
    expect(out.anchor).toBeLessThanOrEqual(out.max);
    expect(out.sample_size).toBe(7);
    expect(out.anchor % 50).toBe(0); // anchor rounded to nearest 50
    expect(out.min % 10).toBe(0);
  });

  it("counts distinct citations, not rows — the published-ref triple is one source", () => {
    const ref = "Saudi-adjusted global freelance reference — docs/published-ref-draft.md";
    const triple = [300, 450, 650].map((p) => ({
      ...row(p, "published_ref", 0.6),
      source_ref: ref,
    }));
    const out = aggregate(triple, NOW)!;
    expect(out.sample_size).toBe(3);
    expect(out.source_count).toBe(1);
  });

  it("treats unattributed rows as one bucket, never one source apiece", () => {
    const out = aggregate([row(900, "founder", 0.3), row(1100, "founder", 0.3)], NOW)!;
    expect(out.source_count).toBe(1);
  });

  it("picks the highest-total-weight provenance as dominant", () => {
    const rows = [
      row(1000, "published_ref", 0.6),
      row(1100, "published_ref", 0.6),
      ...Array.from({ length: 5 }, (_, i) => row(900 + i * 10, "reasoned", 0.2)),
    ];
    const out = aggregate(rows, NOW)!;
    expect(out.dominant_provenance).toBe("published_ref");
    expect(out.sources[0]!.provenance).toBe("published_ref");
  });

  it("rewards larger, fresher, higher-provenance samples with higher confidence", () => {
    const weakSmall = aggregate(
      [row(1000, "reasoned", 0.2, 30), row(1100, "reasoned", 0.2, 30)],
      NOW
    )!;
    const strongLarge = aggregate(
      Array.from({ length: 12 }, (_, i) => row(1000 + i * 20, "published_ref", 0.6, 1)),
      NOW
    )!;
    expect(strongLarge.confidence_score).toBeGreaterThan(weakSmall.confidence_score);
    expect(weakSmall.confidence_score).toBeGreaterThanOrEqual(0);
    expect(strongLarge.confidence_score).toBeLessThanOrEqual(1);
  });

  it("pins the confidence_score formula (family accumulation × sample factor)", () => {
    // 10 fresh published_ref rows from ONE family, each weight 0.6 × 0.6 × 1.0 = 0.36.
    // They corroborate nothing each other does not already say, so the family contributes its
    // strongest row and no more: accumulated = 0.36. Sample is unstated, so the factor floors
    // at 0.25 → 0.36 × 0.25 = 0.09.
    const out = aggregate(
      Array.from({ length: 10 }, (_, i) => row(1000 + i * 20, "published_ref", 0.6, 0)),
      NOW
    )!;
    expect(out.confidence_score).toBeCloseTo(0.09, 2);
  });

  it("a second independent family raises the score; a second row of the same family does not", () => {
    const oneFamily = aggregate(
      [row(1000, "published_ref", 0.6, 0), row(1100, "published_ref", 0.6, 0)],
      NOW
    )!;
    const twoFamilies = aggregate(
      [row(1000, "published_ref", 0.6, 0), { ...row(1100, "founder", 0.6, 0) }],
      NOW
    )!;
    // This is the behaviour change: averaging used to make corroboration LOWER the score.
    expect(twoFamilies.confidence_score).toBeGreaterThan(oneFamily.confidence_score);
  });

  it("a stated sample beats an unstated one of the same weight", () => {
    const unstated = aggregate([row(1000, "published_ref", 0.6, 0)], NOW)!;
    const stated = aggregate(
      [{ ...row(1000, "published_ref", 0.6, 0), published_sample: 182_000 }],
      NOW
    )!;
    expect(stated.confidence_score).toBeGreaterThan(unstated.confidence_score);
  });

  it("keeps min ≤ anchor ≤ max when 50-SAR anchor rounding overshoots a tight band", () => {
    // Regression: round50(p50≈976)=1000 would exceed the 10-SAR-rounded max (980).
    const out = aggregate(
      [974, 975, 976, 977, 978].map((p) => row(p, "founder", 0.3)),
      NOW
    )!;
    expect(out.min).toBe(970);
    expect(out.max).toBe(980);
    expect(out.anchor).toBe(980); // clamped down from 1000 into [min, max]
    expect(out.min).toBeLessThanOrEqual(out.anchor);
    expect(out.anchor).toBeLessThanOrEqual(out.max);
  });

  const SCENARIOS: { name: string; rows: AggRow[]; expectDominant: BenchmarkProvenance }[] = [
    { name: "graphic-design exact founder", rows: [820, 970, 1060, 1140, 1230].map((p) => row(p, "founder", 0.3)), expectDominant: "founder" },
    { name: "graphic-design with submitted mix", rows: [...[900, 1000].map((p) => row(p, "submitted", 0.5)), ...[850, 1050, 1100].map((p) => row(p, "founder", 0.3))], expectDominant: "submitted" },
    { name: "logo reasoned-only gap cell", rows: [1400, 1600, 1800].map((p) => row(p, "reasoned", 0.2)), expectDominant: "reasoned" },
    { name: "web-dev published anchored", rows: [4200, 5000, 6000, 7000].map((p) => row(p, "published_ref", 0.6)), expectDominant: "published_ref" },
    { name: "translation stale founder", rows: [320, 360, 400, 450, 500].map((p) => row(p, "founder", 0.3, 24)), expectDominant: "founder" },
  ];

  for (const sc of SCENARIOS) {
    it(`[scenario] ${sc.name}`, () => {
      const out = aggregate(sc.rows, NOW)!;
      expect(out).not.toBeNull();
      expect(out.dominant_provenance).toBe(sc.expectDominant);
      expect(out.min).toBeLessThanOrEqual(out.anchor);
      expect(out.anchor).toBeLessThanOrEqual(out.max);
      expect(out.confidence_score).toBeGreaterThan(0);
    });
  }
});

describe("agreement between evidence families", () => {
  /**
   * The flaw this guards, measured on the live corpus before the fix: 146 of 581 multi-family
   * cells held sources disagreeing by more than 3x, and 109 of them reported "good" evidence.
   * Cells whose sources contradicted each other scored HIGHER than cells whose sources agreed.
   */
  it("sources that disagree score lower than sources that concur", () => {
    const agreeing = aggregate(
      [
        { ...row(1000, "published_ref", 0.9, 0), source_ref: "YunoJuno", published_sample: 182_000 },
        { ...row(1100, "founder", 0.5, 0), source_ref: "Rizq founder editorial seed" },
      ],
      NOW
    )!;
    const disagreeing = aggregate(
      [
        { ...row(1000, "published_ref", 0.9, 0), source_ref: "YunoJuno", published_sample: 182_000 },
        { ...row(5000, "founder", 0.5, 0), source_ref: "Rizq founder editorial seed" },
      ],
      NOW
    )!;
    expect(disagreeing.confidence_score).toBeLessThan(agreeing.confidence_score);
  });

  it("a single family is not punished for disagreeing with itself", () => {
    const tight = aggregate(
      [row(1000, "published_ref", 0.9, 0), row(1050, "published_ref", 0.9, 0)],
      NOW
    )!;
    const wide = aggregate(
      [row(1000, "published_ref", 0.9, 0), row(9000, "published_ref", 0.9, 0)],
      NOW
    )!;
    // Both are one family, so the spread term must not fire — only genuinely independent
    // bodies of evidence can contradict one another.
    expect(wide.confidence_score).toBe(tight.confidence_score);
  });
});
