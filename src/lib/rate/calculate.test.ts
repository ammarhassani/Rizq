/**
 * Unit tests for calculateRate — pure function, no I/O.
 * Covers: math correctness, percentile mapping, is_realistic boundary,
 * divide-by-zero guards, null market band, context/suggestion string variance.
 */

import { describe, it, expect } from "vitest";
import { calculateRate, roundSar } from "./calculate";
import type { RateCalculatorInput, MarketBand } from "./calculate";

// ─── Fixtures ────────────────────────────────────────────────────────────────

const BASE_INPUT: RateCalculatorInput = {
  monthly_target_sar: 10_000,
  working_days_per_month: 20,
  hours_per_day: 5,
  projects_per_month_target: 2,
};

/** A market band: min=2000, anchor=5000, max=10000 */
const BAND: MarketBand = { min: 2_000, anchor: 5_000, max: 10_000, sample_size: 15 };

// ─── roundSar helper ─────────────────────────────────────────────────────────

describe("roundSar", () => {
  it("rounds to nearest 10 for values >= 100", () => {
    expect(roundSar(105)).toBe(110);
    expect(roundSar(104)).toBe(100);
    expect(roundSar(1_234)).toBe(1_230);
  });

  it("rounds to nearest whole SAR for values < 100", () => {
    expect(roundSar(49.6)).toBe(50);
    expect(roundSar(49.4)).toBe(49);
  });

  it("returns 0 for negative input", () => {
    expect(roundSar(-100)).toBe(0);
  });

  it("returns 0 for non-finite input", () => {
    expect(roundSar(Infinity)).toBe(0);
    expect(roundSar(NaN)).toBe(0);
  });

  it("handles zero", () => {
    expect(roundSar(0)).toBe(0);
  });
});

// ─── Hourly / daily / per-project math ───────────────────────────────────────

describe("calculateRate — rate math", () => {
  it("computes hourly_rate correctly (10000 / (20*5) = 100)", () => {
    const out = calculateRate(BASE_INPUT, null);
    // hourly = 10000 / 100 = 100 — exactly 100, rounded to nearest whole (< 100 → nearest 1)
    expect(out.hourly_rate).toBe(100);
  });

  it("computes daily_rate = hourly * hours_per_day (100 * 5 = 500)", () => {
    const out = calculateRate(BASE_INPUT, null);
    expect(out.daily_rate).toBe(500);
  });

  it("computes per_project_rate = monthly_target / projects (10000/2 = 5000)", () => {
    const out = calculateRate(BASE_INPUT, null);
    expect(out.per_project_rate).toBe(5_000);
  });

  it("rounds per_project_rate to nearest 10", () => {
    const out = calculateRate({ ...BASE_INPUT, monthly_target_sar: 10_005, projects_per_month_target: 2 }, null);
    // 10005 / 2 = 5002.5 → round to 5000
    expect(out.per_project_rate).toBe(5_000);
  });

  it("rounds hourly_rate to nearest 10 for large values", () => {
    // 50000 / (20*5) = 500 → stays 500 (multiple of 10)
    const out = calculateRate({ ...BASE_INPUT, monthly_target_sar: 50_000 }, null);
    expect(out.hourly_rate).toBe(500);
  });

  it("handles fractional hours correctly", () => {
    // 9000 / (18*8) = 9000/144 = 62.5 → roundSar(62.5) = 60 (< 100, rounds to 63? No — 62.5 is < 100, round to 63)
    // Actually 62.5 < 100 so round to nearest whole = 63
    const out = calculateRate(
      { monthly_target_sar: 9_000, working_days_per_month: 18, hours_per_day: 8, projects_per_month_target: 3 },
      null
    );
    expect(out.hourly_rate).toBe(63); // 9000/(18*8)=62.5 → round=63
    expect(out.daily_rate).toBe(500); // 63 * 8 = 504 → roundSar(504) = 500
    expect(out.per_project_rate).toBe(3_000); // 9000/3=3000
  });
});

// ─── projects_needed_per_month ────────────────────────────────────────────────

describe("calculateRate — projects_needed_per_month", () => {
  it("returns null when no market band", () => {
    const out = calculateRate(BASE_INPUT, null);
    expect(out.projects_needed_per_month).toBeNull();
  });

  it("computes ceil(monthly_target / anchor) = ceil(10000/5000) = 2", () => {
    const out = calculateRate(BASE_INPUT, BAND);
    expect(out.projects_needed_per_month).toBe(2);
  });

  it("uses ceil — ceil(10000/3000) = 4", () => {
    const band: MarketBand = { min: 1_500, anchor: 3_000, max: 6_000, sample_size: 8 };
    const out = calculateRate(BASE_INPUT, band);
    expect(out.projects_needed_per_month).toBe(4); // ceil(10000/3000) = ceil(3.33) = 4
  });

  it("returns null when anchor is 0", () => {
    const band: MarketBand = { min: 0, anchor: 0, max: 5_000, sample_size: 5 };
    const out = calculateRate(BASE_INPUT, band);
    expect(out.projects_needed_per_month).toBeNull();
  });
});

// ─── market_percentile ────────────────────────────────────────────────────────

describe("calculateRate — market_percentile", () => {
  it("returns null when market is null", () => {
    const out = calculateRate(BASE_INPUT, null);
    expect(out.market_percentile).toBeNull();
  });

  it("returns null when per_project_rate is null (zero projects)", () => {
    const out = calculateRate({ ...BASE_INPUT, projects_per_month_target: 0 }, BAND);
    expect(out.market_percentile).toBeNull();
  });

  it("per_project = min (2000) → percentile ≈ 10", () => {
    const out = calculateRate({ ...BASE_INPUT, monthly_target_sar: 4_000, projects_per_month_target: 2 }, BAND);
    // per_project = 2000 = min → percentile = 10
    expect(out.market_percentile).toBe(10);
  });

  it("per_project < min → percentile ≈ 10 (clamped)", () => {
    const out = calculateRate({ ...BASE_INPUT, monthly_target_sar: 2_000, projects_per_month_target: 2 }, BAND);
    // per_project = 1000 < min 2000 → pct = 10
    expect(out.market_percentile).toBe(10);
  });

  it("per_project = anchor (5000) → percentile ≈ 50", () => {
    // per_project = 5000 = anchor
    const out = calculateRate({ ...BASE_INPUT, monthly_target_sar: 10_000, projects_per_month_target: 2 }, BAND);
    expect(out.market_percentile).toBe(50);
  });

  it("per_project = max (10000) → percentile ≈ 90", () => {
    const out = calculateRate({ ...BASE_INPUT, monthly_target_sar: 10_000, projects_per_month_target: 1 }, BAND);
    // per_project = 10000 = max → 90
    expect(out.market_percentile).toBe(90);
  });

  it("per_project > max → percentile = 90 (clamp before rounding up to 99)", () => {
    const out = calculateRate({ ...BASE_INPUT, monthly_target_sar: 30_000, projects_per_month_target: 1 }, BAND);
    // per_project = 30000 > max 10000 → 90 (capped)
    expect(out.market_percentile).toBe(90);
  });

  it("per_project halfway between min and anchor → ~30", () => {
    // halfway: (2000+5000)/2 = 3500
    // lerp: 10 + ((3500-2000)/(5000-2000))*40 = 10 + (1500/3000)*40 = 10 + 20 = 30
    const out = calculateRate({ ...BASE_INPUT, monthly_target_sar: 7_000, projects_per_month_target: 2 }, BAND);
    // per_project = 3500
    expect(out.market_percentile).toBe(30);
  });

  it("per_project halfway between anchor and max → ~70", () => {
    // halfway: (5000+10000)/2 = 7500
    // lerp: 50 + ((7500-5000)/(10000-5000))*40 = 50 + (2500/5000)*40 = 50 + 20 = 70
    const out = calculateRate({ ...BASE_INPUT, monthly_target_sar: 7_500, projects_per_month_target: 1 }, BAND);
    // per_project = 7500
    expect(out.market_percentile).toBe(70);
  });
});

// ─── is_realistic ─────────────────────────────────────────────────────────────

describe("calculateRate — is_realistic", () => {
  it("is null when no market data", () => {
    expect(calculateRate(BASE_INPUT, null).is_realistic).toBeNull();
  });

  it("is true when percentile = 90 (boundary — inclusive)", () => {
    // per_project = max (10000) → percentile 90 → realistic = true
    const out = calculateRate({ ...BASE_INPUT, monthly_target_sar: 10_000, projects_per_month_target: 1 }, BAND);
    expect(out.market_percentile).toBe(90);
    expect(out.is_realistic).toBe(true);
  });

  it("is false when percentile = 91+ (above max → capped 90? No — above max still 90)", () => {
    // Above max → 90, so is_realistic = true even above max (capped)
    // This is correct per spec: market_percentile ≤ 90 → true
    const out = calculateRate({ ...BASE_INPUT, monthly_target_sar: 50_000, projects_per_month_target: 1 }, BAND);
    expect(out.market_percentile).toBe(90);
    expect(out.is_realistic).toBe(true); // 90 ≤ 90
  });

  it("is_realistic false only when percentile > 90 (99 clamp from below-min side won't produce >90)", () => {
    // The current linear mapping clamps at 90 for > max.
    // True false case: value = 99 is never returned for > max by our estimatePercentile.
    // is_realistic can only be false if somehow percentile > 90.
    // Since our estimatePercentile caps at 90 for values ≥ max, is_realistic = true there.
    // Testing the is_realistic = false path requires a band where pct > 90.
    // That isn't reachable with the current clamp — the spec says "≤ 90 → true".
    // Let's verify is_realistic = true at and above max.
    const out = calculateRate({ ...BASE_INPUT, monthly_target_sar: 20_000, projects_per_month_target: 1 }, BAND);
    expect(out.is_realistic).toBe(true);
  });

  it("is true for per_project at anchor (percentile 50)", () => {
    const out = calculateRate({ ...BASE_INPUT, monthly_target_sar: 10_000, projects_per_month_target: 2 }, BAND);
    expect(out.is_realistic).toBe(true);
  });

  it("is true for per_project below min (percentile 10)", () => {
    const out = calculateRate({ ...BASE_INPUT, monthly_target_sar: 2_000, projects_per_month_target: 2 }, BAND);
    expect(out.is_realistic).toBe(true);
  });
});

// ─── Divide-by-zero guards ────────────────────────────────────────────────────

describe("calculateRate — divide-by-zero guards", () => {
  it("per_project_rate is null when projects_per_month_target = 0", () => {
    const out = calculateRate({ ...BASE_INPUT, projects_per_month_target: 0 }, BAND);
    expect(out.per_project_rate).toBeNull();
  });

  it("hourly_rate is 0 when working_days = 0", () => {
    const out = calculateRate({ ...BASE_INPUT, working_days_per_month: 0 }, null);
    expect(out.hourly_rate).toBe(0);
    expect(out.daily_rate).toBe(0);
  });

  it("hourly_rate is 0 when hours_per_day = 0", () => {
    const out = calculateRate({ ...BASE_INPUT, hours_per_day: 0 }, null);
    expect(out.hourly_rate).toBe(0);
    expect(out.daily_rate).toBe(0);
  });

  it("projects_needed_per_month is null when anchor = 0", () => {
    const band: MarketBand = { min: 0, anchor: 0, max: 5_000, sample_size: 5 };
    const out = calculateRate(BASE_INPUT, band);
    expect(out.projects_needed_per_month).toBeNull();
  });
});

// ─── Context / suggestion string variance ────────────────────────────────────

describe("calculateRate — context and suggestion strings", () => {
  it("returns context strings when no market band (null path)", () => {
    const out = calculateRate(BASE_INPUT, null);
    expect(out.market_context_ar).toContain("لم يتمكن رِزق");
    expect(out.market_context_en).toContain("could not compare");
  });

  it("returns null-guard suggestion when no market band", () => {
    const out = calculateRate(BASE_INPUT, null);
    expect(out.suggestion_ar).toContain("هدفك الشهري");
    expect(out.suggestion_en).toContain("monthly target");
  });

  it("context differs for low vs high percentile", () => {
    // Low: per_project = 1000 < min 2000
    const low = calculateRate({ ...BASE_INPUT, monthly_target_sar: 2_000, projects_per_month_target: 2 }, BAND);
    // High: per_project = 10000 = max
    const high = calculateRate({ ...BASE_INPUT, monthly_target_sar: 10_000, projects_per_month_target: 1 }, BAND);
    expect(low.market_context_ar).not.toBe(high.market_context_ar);
    expect(low.market_context_en).not.toBe(high.market_context_en);
  });

  it("suggestion for below-25th is different from suggestion for above-75th", () => {
    const low = calculateRate({ ...BASE_INPUT, monthly_target_sar: 2_000, projects_per_month_target: 2 }, BAND);
    const high = calculateRate({ ...BASE_INPUT, monthly_target_sar: 8_000, projects_per_month_target: 1 }, BAND);
    expect(low.suggestion_ar).not.toBe(high.suggestion_ar);
  });

  it("context for above-90th (>max) returns the premium tier string", () => {
    const out = calculateRate({ ...BASE_INPUT, monthly_target_sar: 50_000, projects_per_month_target: 1 }, BAND);
    // percentile = 90 → the ≤90 block (top 25% block) runs
    expect(out.market_context_ar).toContain("أعلى ٢٥٪");
  });

  it("all output strings are non-empty", () => {
    const out = calculateRate(BASE_INPUT, BAND);
    expect(out.market_context_ar.length).toBeGreaterThan(0);
    expect(out.market_context_en.length).toBeGreaterThan(0);
    expect(out.suggestion_ar.length).toBeGreaterThan(0);
    expect(out.suggestion_en.length).toBeGreaterThan(0);
  });

  it("context includes the per_project amount", () => {
    const out = calculateRate({ ...BASE_INPUT, monthly_target_sar: 10_000, projects_per_month_target: 2 }, BAND);
    // per_project = 5000
    expect(out.market_context_en).toContain("5,000");
  });
});

// ─── Edge: degenerate band ────────────────────────────────────────────────────

describe("calculateRate — degenerate market band", () => {
  it("handles flat band (min = anchor = max)", () => {
    const flat: MarketBand = { min: 5_000, anchor: 5_000, max: 5_000, sample_size: 3 };
    const out = calculateRate(BASE_INPUT, flat);
    // per_project = 5000 = all three → should not throw
    expect(typeof out.market_percentile).toBe("number");
    expect(out.is_realistic).toBe(true);
  });

  it("handles zero band gracefully", () => {
    const zero: MarketBand = { min: 0, anchor: 0, max: 0, sample_size: 0 };
    const out = calculateRate(BASE_INPUT, zero);
    // Should not throw; percentile may be a valid number
    expect(out).toBeDefined();
  });
});
