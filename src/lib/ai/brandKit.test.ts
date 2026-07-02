import { describe, it, expect } from "vitest";
import { buildBrandKitPrompt, type BrandKitCtx } from "./brandKit";

const BASE: BrandKitCtx = {
  specialty: "تصميم جرافيك",
  city: "الرياض",
  years: 7,
  fullName: "عمار الحسني",
  locale: "ar",
};

describe("buildBrandKitPrompt", () => {
  it("includes the freelancer's registered context", () => {
    const p = buildBrandKitPrompt(BASE);
    expect(p).toContain("تصميم جرافيك"); // specialty
    expect(p).toContain("الرياض"); // city
    expect(p).toContain("7"); // years
    expect(p).toContain("عمار الحسني"); // name
  });

  it("asks for the three brand fields", () => {
    const p = buildBrandKitPrompt(BASE);
    expect(p).toContain("brand_name");
    expect(p).toContain("tagline");
    expect(p).toContain("bio");
  });

  it("forbids income/hype claims + city-forcing", () => {
    const p = buildBrandKitPrompt(BASE);
    expect(p).toContain("ممنوع");
    expect(p).toMatch(/الدخل|boost your income/);
  });

  it("does not fabricate (honesty guard)", () => {
    const p = buildBrandKitPrompt(BASE);
    expect(p).toContain("لا تخترع");
  });

  it("targets English output when locale=en", () => {
    const p = buildBrandKitPrompt({ ...BASE, locale: "en" });
    expect(p).toContain("English");
  });

  it("handles null context with fallbacks (no throw)", () => {
    const ctx: BrandKitCtx = { specialty: null, city: null, years: null, fullName: null, locale: "ar" };
    expect(() => buildBrandKitPrompt(ctx)).not.toThrow();
    const p = buildBrandKitPrompt(ctx);
    expect(p).toContain("مستقل");
    expect(p).toContain("السعودية");
  });
});
