import { describe, it, expect } from "vitest";
import { freshnessDecay, monthsBetween } from "./freshness";

describe("freshnessDecay", () => {
  it("is 1.0 at capture and floors at 0.1 past 36 months", () => {
    expect(freshnessDecay(0)).toBe(1.0);
    expect(freshnessDecay(-5)).toBe(1.0);
    expect(freshnessDecay(36)).toBeCloseTo(0.1, 5);
    expect(freshnessDecay(60)).toBe(0.1);
  });

  it("hits the spec anchor points", () => {
    expect(freshnessDecay(18)).toBeCloseTo(0.5, 5);
    expect(freshnessDecay(9)).toBeCloseTo(0.75, 5); // midpoint of 1.0→0.5
    expect(freshnessDecay(27)).toBeCloseTo(0.3, 5); // midpoint of 0.5→0.1
  });
});

describe("monthsBetween", () => {
  it("returns ~12 for a year apart", () => {
    const a = new Date("2025-06-12T00:00:00Z");
    const b = new Date("2026-06-12T00:00:00Z");
    expect(monthsBetween(a, b)).toBeCloseTo(12, 0);
  });
});
