import { describe, it, expect } from "vitest";
import { deviationPct, isPriceAnomaly } from "./anomaly";

// ─── deviationPct ─────────────────────────────────────────────────────────────

describe("deviationPct", () => {
  it("returns 0 when avg is 0 (guard)", () => {
    expect(deviationPct(500, 0)).toBe(0);
  });

  it("returns 0 when avg is negative (guard)", () => {
    expect(deviationPct(500, -100)).toBe(0);
  });

  it("returns 0 when amount equals avg", () => {
    expect(deviationPct(1000, 1000)).toBe(0);
  });

  it("returns 0.5 when amount is 50% above avg", () => {
    expect(deviationPct(1500, 1000)).toBeCloseTo(0.5);
  });

  it("returns -0.5 when amount is 50% below avg", () => {
    expect(deviationPct(500, 1000)).toBeCloseTo(-0.5);
  });

  it("returns 0.4 when amount is exactly 40% above avg", () => {
    expect(deviationPct(1400, 1000)).toBeCloseTo(0.4);
  });

  it("returns -0.4 when amount is exactly 40% below avg", () => {
    expect(deviationPct(600, 1000)).toBeCloseTo(-0.4);
  });
});

// ─── isPriceAnomaly ───────────────────────────────────────────────────────────

describe("isPriceAnomaly", () => {
  // ── avg <= 0 guard ────────────────────────────────────────────────────────
  it("returns false when categoryAvg is 0", () => {
    expect(isPriceAnomaly(9999, 0)).toBe(false);
  });

  it("returns false when categoryAvg is negative", () => {
    expect(isPriceAnomaly(9999, -500)).toBe(false);
  });

  // ── 40% above → anomaly at default threshold ──────────────────────────────
  it("returns true when amount is 50% above avg (well above threshold)", () => {
    expect(isPriceAnomaly(1500, 1000)).toBe(true);
  });

  it("returns true when amount is 41% above avg (just over threshold)", () => {
    expect(isPriceAnomaly(1410, 1000)).toBe(true);
  });

  // ── 40% below → anomaly at default threshold ─────────────────────────────
  it("returns true when amount is 50% below avg", () => {
    expect(isPriceAnomaly(500, 1000)).toBe(true);
  });

  it("returns true when amount is 41% below avg (just over threshold)", () => {
    expect(isPriceAnomaly(590, 1000)).toBe(true);
  });

  // ── within threshold → not anomaly ───────────────────────────────────────
  it("returns false when amount is 20% above avg (within threshold)", () => {
    expect(isPriceAnomaly(1200, 1000)).toBe(false);
  });

  it("returns false when amount is 20% below avg (within threshold)", () => {
    expect(isPriceAnomaly(800, 1000)).toBe(false);
  });

  it("returns false when amount equals avg exactly", () => {
    expect(isPriceAnomaly(1000, 1000)).toBe(false);
  });

  // ── boundary: exactly 0.4 is NOT anomaly (strictly greater than) ─────────
  it("returns false when deviation is exactly 0.4 (boundary — NOT anomaly)", () => {
    // amount = 1400, avg = 1000 → deviation = 0.4 exactly → NOT > 0.4
    expect(isPriceAnomaly(1400, 1000)).toBe(false);
  });

  it("returns false when deviation is exactly -0.4 (boundary — NOT anomaly)", () => {
    expect(isPriceAnomaly(600, 1000)).toBe(false);
  });

  // ── custom threshold ──────────────────────────────────────────────────────
  it("returns true at 20% threshold when deviation is 25%", () => {
    expect(isPriceAnomaly(1250, 1000, 0.2)).toBe(true);
  });

  it("returns false at 20% threshold when deviation is exactly 20%", () => {
    expect(isPriceAnomaly(1200, 1000, 0.2)).toBe(false);
  });

  it("returns false at 60% threshold when deviation is 50%", () => {
    expect(isPriceAnomaly(1500, 1000, 0.6)).toBe(false);
  });

  // ── zero amount ───────────────────────────────────────────────────────────
  it("returns true when amount is 0 and avg is positive (100% deviation)", () => {
    expect(isPriceAnomaly(0, 1000)).toBe(true);
  });
});
