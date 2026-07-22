import { describe, it, expect } from "vitest";
import { computeStrength, strengthItems, OPTIMAL_THRESHOLD, type StrengthProfile } from "./strength";

// A profile with EVERY dimension filled (using the fields the editors actually persist).
const FULL: StrengthProfile = {
  full_name_ar: "أحمد",
  fl_number: "12345678",
  specialties: ["web-dev"],
  city: "riyadh",
  years_experience: 10,
  current_hourly_rate_sar: 350,
  income_goal_monthly_sar: 12000,
  brand_name: "Studio",
  bio_ar: "نبذة",
  contact_email: "a@b.com",
  logo_url: "https://x/logo.png",
  notable_clients: ["ClientA"],
};

describe("computeStrength (comprehensive, weighted)", () => {
  it("is 0 for an empty profile", () => {
    expect(computeStrength({})).toBe(0);
  });

  it("is 100 only when the whole profile is filled", () => {
    expect(computeStrength(FULL)).toBe(100);
  });

  it("does NOT hit 100 with only the KYC essentials (brand/bio/portfolio still empty)", () => {
    const kycOnly: StrengthProfile = {
      full_name_ar: "أحمد",
      fl_number: "12345678",
      specialties: ["web-dev"],
      city: "riyadh",
      years_experience: 10,
      current_hourly_rate_sar: 350,
      income_goal_monthly_sar: 12000,
    };
    // full_name8 + fl6 + specialty12 + city10 + experience8 + rate12 + goal8 = 64
    expect(computeStrength(kycOnly)).toBe(64);
  });

  it("adds each dimension's own weight", () => {
    expect(computeStrength({ full_name_ar: "أحمد" })).toBe(8);
    expect(computeStrength({ specialties: ["web-dev"] })).toBe(12);
    expect(computeStrength({ city: "riyadh" })).toBe(10);
    expect(computeStrength({ full_name_ar: "أحمد", city: "riyadh" })).toBe(18);
  });

  it("accepts the fields the editors persist (slug/text/years), not only *_id", () => {
    expect(computeStrength({ specialties: ["web-dev"] })).toBe(12); // not primary_specialty_id
    expect(computeStrength({ city: "riyadh" })).toBe(10); // not city_id
    expect(computeStrength({ years_experience: 5 })).toBe(8); // not experience_tier_id
  });

  it("counts a project-range rate (not only hourly/daily)", () => {
    expect(computeStrength({ current_project_rate_range: { min: 5000, max: 9000 } })).toBe(12);
  });

  it("portfolio is met by ANY portfolio signal (samples, clients, projects, or a platform URL)", () => {
    expect(computeStrength({ linkedin_url: "https://linkedin.com/x" })).toBe(8);
    expect(computeStrength({ total_projects_completed: 12 })).toBe(8);
    expect(computeStrength({ notable_clients: ["A"] })).toBe(8);
    expect(computeStrength({ notable_clients: [] })).toBe(0);
  });

  it("clearing the only specialty drops its weight (the reported bug)", () => {
    const withSpecialty = { ...FULL };
    expect(computeStrength(withSpecialty)).toBe(100);
    const cleared = { ...FULL, specialties: [] as string[] };
    expect(computeStrength(cleared)).toBe(88); // 100 - specialty(12)
  });
});

describe("strengthItems", () => {
  it("returns all 12 dimensions with weights summing to 100", () => {
    const items = strengthItems({});
    expect(items).toHaveLength(12);
    expect(items.reduce((s, i) => s + i.weight, 0)).toBe(100);
    expect(items.every((i) => !i.met)).toBe(true);
  });
  it("marks met dimensions", () => {
    const items = strengthItems({ specialties: ["web-dev"], city: "riyadh" });
    expect(items.find((i) => i.key === "specialty")?.met).toBe(true);
    expect(items.find((i) => i.key === "city")?.met).toBe(true);
    expect(items.find((i) => i.key === "brand")?.met).toBe(false);
  });
});

describe("constants", () => {
  it("OPTIMAL_THRESHOLD is 80", () => {
    expect(OPTIMAL_THRESHOLD).toBe(80);
  });
});
