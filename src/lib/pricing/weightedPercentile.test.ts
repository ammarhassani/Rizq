import { describe, it, expect } from "vitest";
import { weightedPercentile } from "./weightedPercentile";

describe("weightedPercentile", () => {
  it("returns 0 / single value for trivial inputs", () => {
    expect(weightedPercentile([], 0.5)).toBe(0);
    expect(weightedPercentile([{ value: 100, weight: 1 }], 0.5)).toBe(100);
  });

  it("equals the unweighted percentile when weights are equal", () => {
    const pairs = [10, 20, 30, 40, 50].map((value) => ({ value, weight: 1 }));
    // center positions: 0.1,0.3,0.5,0.7,0.9 → p50 = 30
    expect(weightedPercentile(pairs, 0.5)).toBe(30);
  });

  it("pulls the median toward heavily-weighted values", () => {
    const pairs = [
      { value: 100, weight: 9 },
      { value: 1000, weight: 1 },
    ];
    // centers: 100→0.45, 1000→0.95; p0.5 → 100 + 900*((0.5-0.45)/0.5) = 190
    expect(weightedPercentile(pairs, 0.5)).toBe(190);
  });

  it("ignores zero/negative weights", () => {
    const pairs = [
      { value: 100, weight: 0 },
      { value: 200, weight: 1 },
    ];
    expect(weightedPercentile(pairs, 0.5)).toBe(200);
  });
});
