import { describe, it, expect } from "vitest";
import { tierSlugFromYears, type TierRange } from "./experienceTier";

const TIERS: TierRange[] = [
  { slug: "beginner", years_min: 0, years_max: 1 },
  { slug: "junior", years_min: 1, years_max: 3 },
  { slug: "mid", years_min: 3, years_max: 5 },
  { slug: "senior", years_min: 5, years_max: 10 },
  { slug: "expert", years_min: 10, years_max: null },
];

describe("tierSlugFromYears", () => {
  it("maps representative years to the right tier", () => {
    expect(tierSlugFromYears(0, TIERS)).toBe("beginner");
    expect(tierSlugFromYears(2, TIERS)).toBe("junior");
    expect(tierSlugFromYears(4, TIERS)).toBe("mid");
    expect(tierSlugFromYears(7, TIERS)).toBe("senior");
    expect(tierSlugFromYears(12, TIERS)).toBe("expert");
  });
  it("uses [min, max) boundaries (lower-inclusive)", () => {
    expect(tierSlugFromYears(1, TIERS)).toBe("junior"); // 1 → junior, not beginner
    expect(tierSlugFromYears(3, TIERS)).toBe("mid");
    expect(tierSlugFromYears(5, TIERS)).toBe("senior");
    expect(tierSlugFromYears(10, TIERS)).toBe("expert");
  });
  it("returns null for missing/invalid years (caller falls back)", () => {
    expect(tierSlugFromYears(null, TIERS)).toBeNull();
    expect(tierSlugFromYears(undefined, TIERS)).toBeNull();
    expect(tierSlugFromYears(-2, TIERS)).toBeNull();
  });
  it("very high years → most senior tier", () => {
    expect(tierSlugFromYears(40, TIERS)).toBe("expert");
  });
});
