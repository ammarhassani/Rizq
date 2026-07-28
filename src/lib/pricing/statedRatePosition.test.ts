import { describe, it, expect } from "vitest";
import { statedRatePosition, type Band } from "./statedRatePosition";

const BAND: Band = { min: 1890, anchor: 4000, max: 6700 };

describe("statedRatePosition", () => {
  it("places a single stated figure against the band", () => {
    const p = statedRatePosition(BAND, { min: 3000, max: 3000 })!;
    expect(p.position).toBe("within");
    expect(p.stated).toBe(3000);
    expect(p.percent_vs_anchor).toBe(-25); // 3000 vs 4000
  });

  it("uses the midpoint of a stated range", () => {
    const p = statedRatePosition(BAND, { min: 4000, max: 9000 })!;
    expect(p.stated).toBe(6500);
    expect(p.stated_min).toBe(4000);
    expect(p.stated_max).toBe(9000);
    expect(p.position).toBe("within"); // 6500 <= 6700
  });

  it("flags a rate under the floor and over the ceiling", () => {
    expect(statedRatePosition(BAND, { min: 900, max: 900 })!.position).toBe("below");
    expect(statedRatePosition(BAND, { min: 9000, max: 9000 })!.position).toBe("above");
  });

  it("tolerates a reversed range rather than reporting a negative gap", () => {
    const p = statedRatePosition(BAND, { min: 5000, max: 3000 })!;
    expect(p.stated_min).toBe(3000);
    expect(p.stated_max).toBe(5000);
    expect(p.stated).toBe(4000);
    expect(p.percent_vs_anchor).toBe(0);
  });

  it("says nothing when there is nothing honest to say", () => {
    expect(statedRatePosition(BAND, null)).toBeNull();
    expect(statedRatePosition(BAND, undefined)).toBeNull();
    expect(statedRatePosition(BAND, { min: 0, max: 0 })).toBeNull();
    expect(
      statedRatePosition(BAND, { min: Number.NaN, max: 5000 }),
    ).toBeNull();
    // A zero anchor would make the percentage a division by zero.
    expect(statedRatePosition({ min: 0, anchor: 0, max: 0 }, { min: 1, max: 1 })).toBeNull();
  });
});
