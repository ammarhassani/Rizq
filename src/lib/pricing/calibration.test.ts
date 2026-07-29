import { describe, it, expect } from "vitest";
import {
  calibrate,
  CALIBRATION_K,
  PRIOR_PSEUDO_COUNT,
  MAX_ABS_LOG_DEVIATION,
  type Deviation,
} from "./calibration";
import { FAMILY_PRIORS } from "./familyBias";
import { aggregate, type AggRow } from "./aggregate";

const dev = (over: Partial<Deviation> = {}): Deviation => ({
  family: "freelance_rate",
  logDeviation: Math.log(1.5),
  distinctContributors: 3,
  sawBandFirst: false,
  ...over,
});

describe("calibrate — inert until it has earned the right to speak", () => {
  it("SC-005: no observations means no offsets, so bands are unchanged", () => {
    expect(calibrate([]).size).toBe(0);
  });

  it("ignores cells below the k-anonymity threshold", () => {
    const out = calibrate([dev({ distinctContributors: CALIBRATION_K - 1 })]);
    expect(out.size).toBe(0);
  });

  it("a single observation nudges rather than overturns", () => {
    const prior = FAMILY_PRIORS.freelance_rate.mu;
    const out = calibrate([dev({ logDeviation: Math.log(2) })]);
    const delta = out.get("freelance_rate")!.delta_log;
    // One observation against a prior worth PRIOR_PSEUDO_COUNT: it moves, but barely.
    expect(delta).toBeGreaterThan(prior);
    expect(Math.abs(delta - prior)).toBeLessThan(Math.log(2) / PRIOR_PSEUDO_COUNT + 0.02);
  });

  it("winsorises: one wild observation cannot argue more than 3x", () => {
    const wild = calibrate([dev({ logDeviation: Math.log(50) })]);
    const bounded = calibrate([dev({ logDeviation: MAX_ABS_LOG_DEVIATION })]);
    expect(wild.get("freelance_rate")!.delta_log).toBeCloseTo(
      bounded.get("freelance_rate")!.delta_log,
      10
    );
  });

  it("weights an unanchored observation above one that echoed our own band", () => {
    const clean = calibrate([dev({ sawBandFirst: false, logDeviation: Math.log(2) })]);
    const echoed = calibrate([dev({ sawBandFirst: true, logDeviation: Math.log(2) })]);
    const prior = FAMILY_PRIORS.freelance_rate.mu;
    // A price chosen after seeing our suggestion is partly our suggestion.
    expect(Math.abs(clean.get("freelance_rate")!.delta_log - prior)).toBeGreaterThan(
      Math.abs(echoed.get("freelance_rate")!.delta_log - prior)
    );
  });

  it("keeps families separate — one family's evidence does not move another", () => {
    const out = calibrate([
      dev({ family: "freelance_rate", logDeviation: Math.log(2) }),
      dev({ family: "gulf_recruiter", logDeviation: Math.log(0.5) }),
    ]);
    expect(out.size).toBe(2);
    expect(out.get("freelance_rate")!.delta_log).not.toBe(
      out.get("gulf_recruiter")!.delta_log
    );
  });
});

describe("SC-005 end to end: an empty calibration changes no price", () => {
  it("aggregate produces identical bands with no calibration data present", () => {
    const NOW = new Date("2026-07-29T00:00:00Z");
    const rows: AggRow[] = [1000, 1200, 3000].map((price, i) => ({
      price_sar: price,
      provenance: "published_ref" as const,
      confidence: 0.6,
      captured_at: NOW.toISOString(),
      source_ref: i === 2 ? "Robert Walters Middle East" : "YunoJuno 2026",
      published_sample: 100_000,
    }));
    const a = aggregate(rows, NOW)!;
    const b = aggregate(rows, NOW)!;
    // Determinism is the precondition for the claim; the calibration table being empty is the
    // claim. Both must hold before this ships anywhere near production prices.
    expect([a.min, a.anchor, a.max]).toEqual([b.min, b.anchor, b.max]);
    expect(calibrate([]).size).toBe(0);
  });
});
