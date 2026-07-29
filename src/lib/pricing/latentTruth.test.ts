import { describe, it, expect } from "vitest";
import { summariseFamilies, combine, type WeightedRow } from "./latentTruth";
import { currencyBridge, PPP_BRIDGE, PEG_BRIDGE, FAMILY_PRIORS } from "./familyBias";
import type { BenchmarkProvenance } from "./provenance";

const row = (
  price: number,
  provenance: BenchmarkProvenance,
  source_ref: string,
  weight = 0.5,
  published_sample: number | null = null
): WeightedRow => ({ price_sar: price, provenance, source_ref, weight, published_sample });

const YUNO = "YunoJuno 2026 Contractor & Freelancer Rates Report";
const RW = "Robert Walters Middle East Salary Survey 2026";
const SEED = "Saudi-adjusted global freelance reference";

describe("currencyBridge — the number this whole feature turns on", () => {
  it("interpolates in log space, so the midpoint is geometric", () => {
    expect(currencyBridge(0)).toBeCloseTo(PPP_BRIDGE, 6);
    expect(currencyBridge(1)).toBeCloseTo(PEG_BRIDGE, 6);
    // Geometric mean 2.634, NOT the arithmetic 2.80. Arithmetic interpolation would tilt every
    // default toward the peg by ~6% without anyone deciding to.
    expect(currencyBridge(0.5)).toBeCloseTo(Math.sqrt(PPP_BRIDGE * PEG_BRIDGE), 6);
    expect(currencyBridge(0.5)).toBeCloseTo(2.634, 2);
    expect(currencyBridge(0.5)).not.toBeCloseTo(2.8, 1);
  });

  it("is monotone and never throws", () => {
    let prev = 0;
    for (const l of [-1, 0, 0.25, 0.5, 0.75, 1, 2, Number.NaN]) {
      const out = currencyBridge(l);
      expect(Number.isFinite(out)).toBe(true);
      expect(out).toBeGreaterThanOrEqual(PPP_BRIDGE - 1e-9);
      expect(out).toBeLessThanOrEqual(PEG_BRIDGE + 1e-9);
      if (Number.isFinite(l) && l >= 0 && l <= 1) {
        expect(out).toBeGreaterThanOrEqual(prev - 1e-9);
        prev = out;
      }
    }
  });

  it("brackets the measured disagreement — the finding the estimator is built on", () => {
    // 3.75 / 1.85 = 2.03, and the measured Saudi-vs-PPP ratios were 1.88 to 2.76.
    expect(PEG_BRIDGE / PPP_BRIDGE).toBeCloseTo(2.03, 2);
  });
});

describe("summariseFamilies", () => {
  it("groups by derivation and counts sample once per source", () => {
    const out = summariseFamilies([
      row(1000, "published_ref", YUNO, 0.5, 182_000),
      row(1200, "published_ref", YUNO, 0.5, 182_000),
      row(3000, "published_ref", RW, 0.5, 100_000),
    ]);
    const byFam = Object.fromEntries(out.map((s) => [s.family, s]));
    // Two YunoJuno rows are two readings of one survey, not 364,000 observations.
    expect(byFam.freelance_rate!.publishedSample).toBe(182_000);
    expect(byFam.freelance_rate!.rowCount).toBe(2);
    expect(byFam.freelance_rate!.sourceCount).toBe(1);
    expect(byFam.gulf_recruiter!.publishedSample).toBe(100_000);
  });

  it("ignores unusable rows rather than poisoning a family", () => {
    const out = summariseFamilies([
      row(0, "published_ref", YUNO),
      row(-5, "published_ref", YUNO),
      row(1000, "published_ref", YUNO),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0]!.rowCount).toBe(1);
  });
});

describe("combine — the band", () => {
  it("returns null for nothing", () => {
    expect(combine([])).toBeNull();
  });

  it("orders min ≤ anchor ≤ max", () => {
    const band = combine(
      summariseFamilies([
        row(1000, "published_ref", YUNO, 0.5, 182_000),
        row(2000, "published_ref", RW, 0.5, 100_000),
      ])
    )!;
    expect(band.min).toBeLessThanOrEqual(band.anchor);
    expect(band.anchor).toBeLessThanOrEqual(band.max);
  });

  it("a single family cannot disagree with itself", () => {
    const band = combine(
      summariseFamilies([
        row(1000, "published_ref", YUNO, 0.5, 182_000),
        row(9000, "published_ref", YUNO, 0.5, 182_000),
      ])
    )!;
    expect(band.spread).toBe(1);
    expect(band.kind).toBe("agreed");
  });

  it("SC-002: the band spans both clusters when families disagree", () => {
    // The real content-writing · mid conflict: editorial says 500–1,050, the PPP-converted
    // reports say 3,330–4,440. The old pooled median sat inside ONE cluster.
    const band = combine(
      summariseFamilies([
        row(500, "published_ref", SEED, 0.3),
        row(800, "published_ref", SEED, 0.3),
        row(1050, "published_ref", SEED, 0.3),
        row(3330, "published_ref", YUNO, 0.5, 1_100),
        row(4440, "published_ref", YUNO, 0.5, 1_100),
      ])
    )!;
    for (const f of band.families) {
      expect(f.adjusted).toBeGreaterThanOrEqual(band.min);
      expect(f.adjusted).toBeLessThanOrEqual(band.max);
    }
  });

  it("SC-001: reweighting a source by ±20% moves the anchor less than 5%", () => {
    // The incident this replaces: one confidence change moved 199 of 700 bands, with extremes
    // of −85.9% and +44.4%, because a weighted median over a bimodal set flips clusters.
    const build = (w: number) =>
      combine(
        summariseFamilies([
          row(500, "published_ref", SEED, 0.3),
          row(800, "published_ref", SEED, 0.3),
          row(1050, "published_ref", SEED, 0.3),
          row(3330, "published_ref", YUNO, w, 1_100),
          row(4440, "published_ref", YUNO, w, 1_100),
          row(9000, "published_ref", RW, 0.5, 100_000),
        ])!
      )!;
    const base = build(0.5).anchor;
    for (const w of [0.4, 0.6]) {
      const moved = build(w).anchor;
      expect(Math.abs(moved - base) / base).toBeLessThan(0.05);
    }
  });

  it("classifies agreement, disagreement and refusal", () => {
    const at = (a: number, b: number) =>
      combine(
        summariseFamilies([
          row(a, "published_ref", YUNO, 0.5, 182_000),
          row(b, "published_ref", RW, 0.5, 100_000),
        ])
      )!;
    expect(at(1000, 1100).kind).toBe("agreed");
    expect(at(1000, 2500).kind).toBe("disagreement");
    // An 8× range is not an answer a freelancer can quote to a client.
    expect(at(1000, 20_000).kind).toBe("insufficient");
  });

  it("editorial never anchors where a cited family exists", () => {
    const withEditorial = combine(
      summariseFamilies([
        row(500, "founder", "Rizq founder editorial seed", 0.3),
        row(4000, "published_ref", YUNO, 0.5, 182_000),
      ])
    )!;
    const citedOnly = combine(
      summariseFamilies([row(4000, "published_ref", YUNO, 0.5, 182_000)])
    )!;
    // Editorial may widen, but it must not drag the centre toward its own guess.
    expect(withEditorial.families.some((f) => f.family === "editorial")).toBe(false);
    expect(withEditorial.anchor).toBeCloseTo(citedOnly.anchor, 6);
  });

  it("falls back to editorial only when nothing cited exists", () => {
    const band = combine(
      summariseFamilies([row(800, "founder", "Rizq founder editorial seed", 0.3)])
    )!;
    expect(band.families.map((f) => f.family)).toEqual(["editorial"]);
  });

  it("a family's declared bias shifts it toward the others, not away", () => {
    // gulf_recruiter carries a positive mu (recruiters skew to large employers), so its adjusted
    // median must land BELOW its raw one.
    const s = summariseFamilies([row(10_000, "published_ref", RW, 0.5, 100_000)]);
    const band = combine(s)!;
    expect(FAMILY_PRIORS.gulf_recruiter.mu).toBeGreaterThan(0);
    expect(band.families[0]!.adjusted).toBeLessThan(10_000);
  });

  it("a wider prior contributes width, not location", () => {
    const tight = combine(summariseFamilies([row(1000, "published_ref", YUNO, 0.5, 182_000)]))!;
    const loose = combine(summariseFamilies([row(1000, "founder", "Rizq founder editorial seed", 0.5)]))!;
    // editorial tau is 1.0 against freelance_rate's 0.45 — same single figure, much wider band.
    expect(loose.max - loose.min).toBeGreaterThan(tight.max - tight.min);
  });
});
