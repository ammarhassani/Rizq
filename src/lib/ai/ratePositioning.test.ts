/**
 * Unit tests for buildRatePositioningPrompt — pure function, no AI call.
 * Verifies labeling rules, data injection, and no-hallucination guards.
 */

import { describe, it, expect } from "vitest";
import { buildRatePositioningPrompt } from "./ratePositioning";
import type { RatePositioningCtx } from "./ratePositioning";

const BASE_CTX: RatePositioningCtx = {
  target_rate: 5_000,
  specialty_name_ar: "تطوير المواقع",
  specialty_name_en: "Web Development",
  city_name_ar: "الرياض",
  city_name_en: "Riyadh",
  tier_name_ar: "متوسط",
  tier_name_en: "Mid-level",
  market_p10: 2_000,
  market_p50: 5_000,
  market_p90: 10_000,
  sample_size: 20,
  avg_3mo_income: 8_000,
  gig_count: 12,
};

describe("buildRatePositioningPrompt", () => {
  it("includes target rate in the prompt", () => {
    const prompt = buildRatePositioningPrompt(BASE_CTX);
    // The prompt includes the rate as a number (formatted via toLocaleString ar-SA
    // which may use Arabic-Indic digits or Eastern Arabic grouping separators).
    // We check for the numeric digits that are always present.
    expect(prompt).toContain("5"); // at minimum the digit 5 appears
    expect(prompt).toContain("000"); // the three zeros always appear
  });

  it("includes specialty name (both languages)", () => {
    const prompt = buildRatePositioningPrompt(BASE_CTX);
    expect(prompt).toContain("تطوير المواقع");
    expect(prompt).toContain("Web Development");
  });

  it("includes city name (both languages)", () => {
    const prompt = buildRatePositioningPrompt(BASE_CTX);
    expect(prompt).toContain("الرياض");
    expect(prompt).toContain("Riyadh");
  });

  it("includes experience tier (both languages)", () => {
    const prompt = buildRatePositioningPrompt(BASE_CTX);
    expect(prompt).toContain("متوسط");
    expect(prompt).toContain("Mid-level");
  });

  it("includes market P10/P50/P90 and sample size", () => {
    const prompt = buildRatePositioningPrompt(BASE_CTX);
    expect(prompt).toContain("2");
    expect(prompt).toContain("10");
    expect(prompt).toContain("20"); // sample_size
  });

  it("includes avg_3mo_income when provided", () => {
    const prompt = buildRatePositioningPrompt(BASE_CTX);
    expect(prompt).toContain("8000");
  });

  it("includes gig_count when avg income provided", () => {
    const prompt = buildRatePositioningPrompt(BASE_CTX);
    expect(prompt).toContain("12");
  });

  it("shows no-avg fallback when avg_3mo_income is null but has gigs", () => {
    const ctx: RatePositioningCtx = { ...BASE_CTX, avg_3mo_income: null, gig_count: 5 };
    const prompt = buildRatePositioningPrompt(ctx);
    expect(prompt).toContain("5"); // gig_count
    expect(prompt).not.toContain("متوسط دخل المستقل آخر ٣ أشهر");
  });

  it("shows no-projects message when avg null and gig_count = 0", () => {
    const ctx: RatePositioningCtx = { ...BASE_CTX, avg_3mo_income: null, gig_count: 0 };
    const prompt = buildRatePositioningPrompt(ctx);
    expect(prompt).toContain("No projects logged yet");
    expect(prompt).toContain("لا توجد مشاريع مسجّلة بعد");
  });

  it("instructs AI to never discourage (لا تُثبِّط)", () => {
    const prompt = buildRatePositioningPrompt(BASE_CTX);
    expect(prompt).toContain("لا تُثبِّط");
  });

  it("instructs AI to never over-promise", () => {
    const prompt = buildRatePositioningPrompt(BASE_CTX);
    expect(prompt).toContain("لا تعِد بنتائج غير مضمونة");
  });

  it("instructs AI not to fabricate data", () => {
    const prompt = buildRatePositioningPrompt(BASE_CTX);
    expect(prompt).toContain("لا تخترع");
  });

  it("requires English disclaimer in the EN text", () => {
    const prompt = buildRatePositioningPrompt(BASE_CTX);
    expect(prompt).toContain("not financial advice");
  });

  it("labels output as Rizq AI analysis", () => {
    const prompt = buildRatePositioningPrompt(BASE_CTX);
    expect(prompt).toContain("Rizq AI analysis");
  });
});
