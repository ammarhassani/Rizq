import { describe, it, expect } from "vitest";
import { computeStrength, strengthItems, OPTIMAL_THRESHOLD, type StrengthProfile } from "./strength";

/** Every one of the 15 dimensions filled (using the fields the editors persist). */
const FULL: StrengthProfile = {
  full_name_ar: "أحمد",
  fl_number: "12345678",
  specialties: ["web-dev"],
  city: "riyadh",
  years_experience: 10,
  current_hourly_rate_sar: 350,
  income_goal_monthly_sar: 12000,
  brand_name: "Studio",
  tagline_ar: "شعار",
  bio_ar: "نبذة",
  logo_url: "https://x/logo.png",
  contact_email: "a@b.com",
  portfolio_samples: [{ title: "x" }],
  notable_clients: ["ClientA"],
  linkedin_url: "https://linkedin.com/x",
};

describe("computeStrength (granular, honest)", () => {
  it("is 0 for an empty profile", () => {
    expect(computeStrength({})).toBe(0);
  });

  it("is 100 only when EVERY dimension is filled", () => {
    expect(computeStrength(FULL)).toBe(100);
  });

  it("KYC essentials alone are far from 100 (brand/tagline/bio/logo/samples/clients/platforms empty)", () => {
    const kyc: StrengthProfile = {
      full_name_ar: "أحمد",
      fl_number: "12345678",
      specialties: ["web-dev"],
      city: "riyadh",
      years_experience: 10,
      current_hourly_rate_sar: 350,
      income_goal_monthly_sar: 12000,
    };
    // 6+11+8+8+11+7+5 = 56
    expect(computeStrength(kyc)).toBe(56);
  });

  it("each unfilled section is honestly missing — e.g. no logo, no tagline, no platforms drops the score", () => {
    const noExtras = { ...FULL, logo_url: null, tagline_ar: null, tagline_en: null };
    // 100 - logo(5) - tagline(5) = 90
    expect(computeStrength(noExtras)).toBe(90);
    const noPlatforms = { ...FULL, linkedin_url: null };
    // platforms had only linkedin → now unmet → 100 - 5 = 95
    expect(computeStrength(noPlatforms)).toBe(95);
    const noSamples = { ...FULL, portfolio_samples: [] as unknown[] };
    expect(computeStrength(noSamples)).toBe(95);
  });

  it("accepts the fields the editors persist (slug/text/years), not only *_id", () => {
    expect(computeStrength({ specialties: ["web-dev"] })).toBe(11);
    expect(computeStrength({ city: "riyadh" })).toBe(8);
    expect(computeStrength({ years_experience: 5 })).toBe(8);
  });

  it("platforms is met by any presence signal (a URL or a used-platform flag)", () => {
    expect(computeStrength({ behance_url: "https://be/x" })).toBe(5);
    expect(computeStrength({ uses_bahr: true })).toBe(5);
  });

  it("clearing the only specialty drops its weight (the reported bug)", () => {
    expect(computeStrength(FULL)).toBe(100);
    expect(computeStrength({ ...FULL, specialties: [] as string[] })).toBe(89); // 100 - specialty(11)
  });
});

describe("strengthItems", () => {
  it("returns 15 dimensions whose weights sum to 100", () => {
    const items = strengthItems({});
    expect(items).toHaveLength(15);
    expect(items.reduce((s, i) => s + i.weight, 0)).toBe(100);
    expect(items.every((i) => !i.met)).toBe(true);
  });
  it("marks the unfilled sections as missing", () => {
    const items = strengthItems({ specialties: ["web-dev"], city: "riyadh" });
    expect(items.find((i) => i.key === "logo")?.met).toBe(false);
    expect(items.find((i) => i.key === "tagline")?.met).toBe(false);
    expect(items.find((i) => i.key === "platforms")?.met).toBe(false);
    expect(items.find((i) => i.key === "specialty")?.met).toBe(true);
  });
});

describe("constants", () => {
  it("OPTIMAL_THRESHOLD is 80", () => {
    expect(OPTIMAL_THRESHOLD).toBe(80);
  });
});
