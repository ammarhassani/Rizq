import { describe, it, expect } from "vitest";
import {
  resolveHours,
  HOURS_OVERRIDE_MIN_N,
  FALLBACK_HOURS,
  type HoursRecord,
} from "./projectHours";

const rec = (over: Partial<HoursRecord> = {}): HoursRecord => ({
  project_size: "medium",
  hours: 24,
  provenance: "reasoned",
  n: 0,
  ...over,
});

describe("resolveHours", () => {
  it("falls back to the shipped assumption when nothing is recorded", () => {
    const out = resolveHours("medium", []);
    expect(out.hours).toBe(FALLBACK_HOURS.medium);
    expect(out.provenance).toBe("reasoned");
    expect(out.n).toBe(0);
  });

  it("measured beats stated beats assumed, once each has cleared the threshold", () => {
    const records = [
      rec({ provenance: "reasoned", hours: 24, n: 0 }),
      rec({ provenance: "stated", hours: 40, n: HOURS_OVERRIDE_MIN_N }),
      rec({ provenance: "measured", hours: 35, n: HOURS_OVERRIDE_MIN_N }),
    ];
    expect(resolveHours("medium", records).provenance).toBe("measured");
    expect(resolveHours("medium", records).hours).toBe(35);

    const noMeasured = records.filter((r) => r.provenance !== "measured");
    expect(resolveHours("medium", noMeasured).provenance).toBe("stated");
  });

  it("a thin observed figure does not outrank the assumption", () => {
    // Two people saying a medium project takes 90 hours is a smaller guess, not a better one.
    const out = resolveHours("medium", [
      rec({ provenance: "reasoned", hours: 24, n: 0 }),
      rec({ provenance: "measured", hours: 90, n: HOURS_OVERRIDE_MIN_N - 1 }),
    ]);
    expect(out.hours).toBe(24);
    expect(out.provenance).toBe("reasoned");
  });

  it("keeps sizes separate", () => {
    const out = resolveHours("small", [
      rec({ project_size: "medium", provenance: "measured", hours: 40, n: 20 }),
    ]);
    expect(out.hours).toBe(FALLBACK_HOURS.small);
  });

  it("ignores nonsense hours rather than pricing from them", () => {
    const out = resolveHours("large", [
      rec({ project_size: "large", provenance: "measured", hours: 0, n: 50 }),
      rec({ project_size: "large", provenance: "measured", hours: -5, n: 50 }),
    ]);
    expect(out.hours).toBe(FALLBACK_HOURS.large);
  });

  it("reports its basis so the price can say which one produced it", () => {
    const out = resolveHours("enterprise", [
      rec({ project_size: "enterprise", provenance: "stated", hours: 200, n: 12 }),
    ]);
    expect(out).toEqual({ hours: 200, provenance: "stated", n: 12 });
  });
});
