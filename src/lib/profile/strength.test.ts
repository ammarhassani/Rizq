import { describe, it, expect } from "vitest";
import { computeStrength, strengthItems, OPTIMAL_THRESHOLD, type StrengthProfile } from "./strength";

/** All 10 CORE (required) dimensions filled — nothing a newcomer couldn't provide. No history. */
const FULL_CORE: StrengthProfile = {
  full_name_ar: "أحمد",
  specialties: ["web-dev"],
  city: "riyadh",
  years_experience: 0, // a brand-new freelancer — 0 years is a valid answer
  current_hourly_rate_sar: 350,
  income_goal_monthly_sar: 12000,
  brand_name: "Studio",
  tagline_ar: "شعار",
  bio_ar: "نبذة",
  contact_email: "a@b.com",
};

describe("computeStrength — setup, not track record", () => {
  it("is 0 for an empty profile", () => {
    expect(computeStrength({})).toBe(0);
  });

  it("a newcomer with NO history (no FL, logo, samples, clients, platforms) can still reach 100%", () => {
    expect(computeStrength(FULL_CORE)).toBe(100);
  });

  it("0 years of experience counts as answered (not held against a newcomer)", () => {
    expect(computeStrength({ years_experience: 0 })).toBe(10); // experience weight
    // and a full-core profile with 0 years is still 100
    expect(computeStrength({ ...FULL_CORE, years_experience: 0 })).toBe(100);
  });

  it("optional extras NEVER change the score (present or absent = same %)", () => {
    const withExtras = {
      ...FULL_CORE,
      fl_number: "12345678",
      logo_url: "https://x/logo.png",
      portfolio_samples: [{ title: "x" }],
      notable_clients: ["A"],
      linkedin_url: "https://linkedin.com/x",
    };
    expect(computeStrength(withExtras)).toBe(100);
    expect(computeStrength(FULL_CORE)).toBe(100);
  });

  it("missing a REQUIRED field lowers the score", () => {
    expect(computeStrength({ ...FULL_CORE, tagline_ar: null })).toBe(94); // -tagline(6)
    expect(computeStrength({ ...FULL_CORE, specialties: [] as string[] })).toBe(86); // -specialty(14)
  });

  it("accepts the fields the editors persist (slug/text/years), not only *_id", () => {
    expect(computeStrength({ specialties: ["web-dev"] })).toBe(14);
    expect(computeStrength({ city: "riyadh" })).toBe(10);
  });
});

describe("strengthItems", () => {
  it("returns 15 items: 10 required (weights sum 100) + 5 optional (weight 0)", () => {
    const items = strengthItems({});
    expect(items).toHaveLength(15);
    const required = items.filter((i) => !i.optional);
    const optional = items.filter((i) => i.optional);
    expect(required).toHaveLength(10);
    expect(optional).toHaveLength(5);
    expect(required.reduce((s, i) => s + i.weight, 0)).toBe(100);
    expect(optional.every((i) => i.weight === 0)).toBe(true);
  });
  it("history dimensions are flagged optional", () => {
    const items = strengthItems({});
    for (const key of ["fl_number", "logo", "samples", "clients", "platforms"]) {
      expect(items.find((i) => i.key === key)?.optional).toBe(true);
    }
  });
});

describe("constants", () => {
  it("OPTIMAL_THRESHOLD is 80", () => {
    expect(OPTIMAL_THRESHOLD).toBe(80);
  });
});
