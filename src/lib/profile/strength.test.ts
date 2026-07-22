import { describe, it, expect } from "vitest";
import { computeStrength, strengthItems, STRENGTH_STEP_PCT, OPTIMAL_THRESHOLD, type StrengthProfile } from "./strength";

const EMPTY: StrengthProfile = {};
const FULL: StrengthProfile = {
  full_name_ar: "أحمد",
  fl_number: "12345678",
  primary_specialty_id: "s1",
  city_id: "c1",
  experience_tier_id: "t1",
  current_hourly_rate_sar: 150,
  income_goal_monthly_sar: 12000,
};

describe("computeStrength", () => {
  it("is 0 for an empty profile", () => {
    expect(computeStrength(EMPTY)).toBe(0);
  });
  it("is 100 when all 7 core fields are set", () => {
    expect(computeStrength(FULL)).toBe(100);
  });
  it("counts a daily rate as the rate field (either hourly or daily)", () => {
    const { current_hourly_rate_sar, ...rest } = FULL;
    void current_hourly_rate_sar;
    expect(computeStrength({ ...rest, current_daily_rate_sar: 1000 })).toBe(100);
  });
  it("each filled core field adds ~1/7 of 100", () => {
    expect(computeStrength({ full_name_ar: "أحمد" })).toBe(Math.round((1 / 7) * 100)); // 14
    expect(computeStrength({ full_name_ar: "أحمد", city_id: "c1" })).toBe(Math.round((2 / 7) * 100)); // 29
  });
  it("ignores non-core fields", () => {
    expect(computeStrength({ ...EMPTY, income_goal_monthly_sar: null } as StrengthProfile)).toBe(0);
  });
});

describe("strengthItems", () => {
  it("returns 7 items with correct met flags", () => {
    const items = strengthItems({ full_name_ar: "أحمد", city_id: "c1" });
    expect(items).toHaveLength(7);
    expect(items.find((i) => i.key === "full_name")?.met).toBe(true);
    expect(items.find((i) => i.key === "city")?.met).toBe(true);
    expect(items.find((i) => i.key === "specialty")?.met).toBe(false);
  });
  it("every item is met for a full profile", () => {
    expect(strengthItems(FULL).every((i) => i.met)).toBe(true);
  });
});

describe("constants", () => {
  it("STRENGTH_STEP_PCT is ~14", () => {
    expect(STRENGTH_STEP_PCT).toBe(14);
  });
  it("OPTIMAL_THRESHOLD is 80", () => {
    expect(OPTIMAL_THRESHOLD).toBe(80);
  });
});
