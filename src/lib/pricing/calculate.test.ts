import { describe, it, expect } from "vitest";
import { percentile } from "./percentile";

describe("percentile", () => {
  it("returns 0 for an empty array", () => {
    expect(percentile([], 0.5)).toBe(0);
    expect(percentile([], 0.1)).toBe(0);
    expect(percentile([], 0.9)).toBe(0);
  });

  it("returns the single value for a one-element array", () => {
    expect(percentile([100], 0.0)).toBe(100);
    expect(percentile([100], 0.5)).toBe(100);
    expect(percentile([100], 1.0)).toBe(100);
  });

  it("returns the median for a small ascending array", () => {
    // [1,2,3,4,5] → median at idx 2 = 3
    expect(percentile([1, 2, 3, 4, 5], 0.5)).toBe(3);
  });

  it("computes p10 / p50 / p90 over a typical seed sample", () => {
    // Roughly the kind of distribution the tool sees for one combo
    const prices = [800, 900, 1000, 1100, 1200, 1400, 1500];
    // 7 points → indices: p10 → idx 0.6 → between 800 and 900 → 860
    expect(percentile(prices, 0.1)).toBeCloseTo(860, 0);
    // p50 → idx 3.0 → exactly 1100
    expect(percentile(prices, 0.5)).toBe(1100);
    // p90 → idx 5.4 → between 1400 and 1500 → 1440
    expect(percentile(prices, 0.9)).toBeCloseTo(1440, 0);
  });

  it("uses linear interpolation between adjacent sorted values", () => {
    // [10, 20]: p25 → idx 0.25 → 10 + 0.25*(20-10) = 12.5
    expect(percentile([10, 20], 0.25)).toBe(12.5);
    // p75 → idx 0.75 → 10 + 0.75*10 = 17.5
    expect(percentile([10, 20], 0.75)).toBe(17.5);
  });

  it("never returns NaN/undefined for valid input", () => {
    const arr = Array.from({ length: 30 }, (_, i) => 100 + i * 50).sort(
      (a, b) => a - b
    );
    for (const p of [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1]) {
      const v = percentile(arr, p);
      expect(Number.isFinite(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(arr[0]!);
      expect(v).toBeLessThanOrEqual(arr[arr.length - 1]!);
    }
  });

  it("matches the Postgres percentile_cont result on a known sample", () => {
    // Mirrors the SQL check we ran in Sprint 3 verification.
    // For graphic-design + riyadh + mid, prices roughly:
    const prices = [820, 970, 1060, 1140, 1230].sort((a, b) => a - b);
    expect(percentile(prices, 0.1)).toBeCloseTo(880, 0);
    expect(percentile(prices, 0.5)).toBe(1060);
    expect(percentile(prices, 0.9)).toBeCloseTo(1194, 0);
  });
});
