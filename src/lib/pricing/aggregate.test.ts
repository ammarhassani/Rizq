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

  it("no longer exposes a scalar confidence anyone could interpret", () => {
    // Feature 013 deleted the noisy-or accumulation, the agreement multiplier and the standalone
    // sample factor. `confidence_score` survives only so the stored `queries` row and the share
    // page keep their shape; nothing renders it. Evidence now reaches the reader as composition
    // and band width, so the assertions that used to pin its formula are gone with the formula.
    const out = aggregate(
      Array.from({ length: 10 }, (_, i) => row(1000 + i * 20, "published_ref", 0.6, 0)),
      NOW
    )!;
    expect(out.confidence_score).toBeGreaterThanOrEqual(0);
    expect(out.confidence_score).toBeLessThanOrEqual(1);
  });

  it("reports which families produced the band and how many sources stood behind each", () => {
    const out = aggregate(
      [
        { ...row(1000, "published_ref", 0.6, 0), source_ref: "YunoJuno 2026" },
        { ...row(3000, "published_ref", 0.6, 0), source_ref: "Robert Walters Middle East" },
      ],
      NOW
    )!;
    const fams = out.families.map((f) => f.family).sort();
    expect(fams).toEqual(["freelance_rate", "gulf_recruiter"]);
    expect(out.families.every((f) => f.sourceCount >= 1)).toBe(true);
  });

  it("a stated sample tightens the band against an unstated one", () => {
    const unstated = aggregate([row(1000, "published_ref", 0.6, 0)], NOW)!;
    const stated = aggregate(
      [{ ...row(1000, "published_ref", 0.6, 0), published_sample: 182_000 }],
      NOW
    )!;
    // Sample size moved from a standalone multiplier on a hidden score into the component
    // variance, where it does visible work: 182,000 respondents earn a narrower band.
    expect(stated.max - stated.min).toBeLessThan(unstated.max - unstated.min);
  });

  it("keeps min ≤ anchor ≤ max when 50-SAR anchor rounding overshoots a tight band", () => {
    // Regression on the ordering invariant, which survives the estimator change. The exact
    // edges no longer come from percentiles over pooled rows — a mixture over one family with a
    // wide editorial prior is deliberately wider than the raw spread — but round50 on the anchor
    // can still overshoot round10 on the max, and the clamp must still catch it.
    const out = aggregate(
      [974, 975, 976, 977, 978].map((p) => row(p, "founder", 0.3)),
      NOW
    )!;
    expect(out.min).toBeLessThanOrEqual(out.anchor);
    expect(out.anchor).toBeLessThanOrEqual(out.max);
    expect(out.anchor % 50).toBe(0);
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
  it("sources that disagree produce a WIDER band than sources that concur", () => {
    // Two CITED families. Pairing a cited family with editorial would prove nothing here:
    // editorial is excluded from the anchor wherever a cited family exists, so its figure cannot
    // move the band either way — which the test below asserts directly.
    const agreeing = aggregate(
      [
        { ...row(1000, "published_ref", 0.9, 0), source_ref: "YunoJuno 2026", published_sample: 182_000 },
        { ...row(1100, "published_ref", 0.9, 0), source_ref: "Robert Walters Middle East", published_sample: 100_000 },
      ],
      NOW
    )!;
    const disagreeing = aggregate(
      [
        { ...row(1000, "published_ref", 0.9, 0), source_ref: "YunoJuno 2026", published_sample: 182_000 },
        { ...row(2600, "published_ref", 0.9, 0), source_ref: "Robert Walters Middle East", published_sample: 100_000 },
      ],
      NOW
    )!;
    // The mechanism moved: disagreement used to shave an invisible score, and now widens the
    // visible band. Width is something the freelancer can act on; the score never was.
    expect(disagreeing.max - disagreeing.min).toBeGreaterThan(agreeing.max - agreeing.min);
    expect(disagreeing.band_kind).not.toBe("agreed");
    expect(agreeing.band_kind).toBe("agreed");
  });

  it("editorial evidence cannot move a band that has a cited family in it", () => {
    const citedOnly = aggregate(
      [{ ...row(4000, "published_ref", 0.9, 0), source_ref: "YunoJuno 2026", published_sample: 182_000 }],
      NOW
    )!;
    const withEditorial = aggregate(
      [
        { ...row(4000, "published_ref", 0.9, 0), source_ref: "YunoJuno 2026", published_sample: 182_000 },
        { ...row(400, "founder", 0.5, 0), source_ref: "Rizq founder editorial seed" },
      ],
      NOW
    )!;
    // The 4x content-writing conflict was the seed dragging an anchor it had no standing to move.
    expect(withEditorial.anchor).toBe(citedOnly.anchor);
  });

  it("a single family cannot disagree with itself", () => {
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
    expect(wide.family_spread).toBe(1);
    expect(tight.family_spread).toBe(1);
    expect(wide.band_kind).toBe("agreed");
  });
});

describe("published sample is counted once per source, not once per row", () => {
  it("ten roles from one survey do not read as ten surveys", () => {
    const one = aggregate(
      [{ ...row(1000, "published_ref", 0.9, 0), source_ref: "Robert Walters", published_sample: 100_000 }],
      NOW
    )!;
    const ten = aggregate(
      Array.from({ length: 10 }, (_, i) => ({
        ...row(1000 + i, "published_ref", 0.9, 0),
        source_ref: "Robert Walters",
        published_sample: 100_000,
      })),
      NOW
    )!;
    // Same survey, same stated sample — more rows lifted from it is not more evidence.
    expect(ten.confidence_score).toBe(one.confidence_score);
    expect(ten.families[0]!.sourceCount).toBe(1);
    expect(one.families[0]!.sourceCount).toBe(1);
  });
});
