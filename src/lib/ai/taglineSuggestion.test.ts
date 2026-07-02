/**
 * Unit tests for buildTaglinePrompt — pure function, no AI SDK needed.
 * Verifies that the prompt includes required context, labeling, and guards.
 */

import { describe, it, expect } from "vitest";
import { buildTaglinePrompt } from "./taglineSuggestion";
import type { TaglineCtx } from "./taglineSuggestion";

const BASE_CTX: TaglineCtx = {
  specialty: "تصميم جرافيك",
  bio_ar: "أنا مصمم جرافيك سعودي بخبرة ٧ سنوات في هوية الشركات.",
  city: "الرياض",
  locale: "ar",
};

describe("buildTaglinePrompt", () => {
  it("includes the specialty in the prompt", () => {
    const prompt = buildTaglinePrompt(BASE_CTX);
    expect(prompt).toContain("تصميم جرافيك");
  });

  it("includes the city in the prompt", () => {
    const prompt = buildTaglinePrompt(BASE_CTX);
    expect(prompt).toContain("الرياض");
  });

  it("includes bio_ar content in the prompt", () => {
    const prompt = buildTaglinePrompt(BASE_CTX);
    expect(prompt).toContain("مصمم جرافيك سعودي");
  });

  it("asks for exactly 3 taglines", () => {
    const prompt = buildTaglinePrompt(BASE_CTX);
    expect(prompt).toContain("3");
  });

  it("includes the no-fabrication guard", () => {
    const prompt = buildTaglinePrompt(BASE_CTX);
    expect(prompt).toContain("لا تخترع");
  });

  it("asks for the taglines array (single strings)", () => {
    const prompt = buildTaglinePrompt(BASE_CTX);
    expect(prompt).toContain("taglines");
  });

  it("forbids income/hype claims", () => {
    const prompt = buildTaglinePrompt(BASE_CTX);
    expect(prompt).toMatch(/ممنوع|الدخل|boost your income/);
  });

  it("includes the Saudi-market context directive", () => {
    const prompt = buildTaglinePrompt(BASE_CTX);
    expect(prompt).toMatch(/سعودي|Saudi/);
  });

  it("includes the 'suggestions only' disclaimer", () => {
    const prompt = buildTaglinePrompt(BASE_CTX);
    expect(prompt).toContain("اقتراحات");
  });

  it("handles null specialty with fallback", () => {
    const ctx: TaglineCtx = { ...BASE_CTX, specialty: null };
    const prompt = buildTaglinePrompt(ctx);
    // Falls back to generic label
    expect(prompt).toContain("مستقل");
  });

  it("handles null city with fallback", () => {
    const ctx: TaglineCtx = { ...BASE_CTX, city: null };
    const prompt = buildTaglinePrompt(ctx);
    expect(prompt).toContain("السعودية");
  });

  it("handles null bio_ar gracefully (no throws)", () => {
    const ctx: TaglineCtx = { ...BASE_CTX, bio_ar: null };
    expect(() => buildTaglinePrompt(ctx)).not.toThrow();
    const prompt = buildTaglinePrompt(ctx);
    expect(prompt).toContain("لا توجد نبذة");
  });

  it("truncates long bio_ar to 400 chars", () => {
    const longBio = "ب".repeat(800);
    const ctx: TaglineCtx = { ...BASE_CTX, bio_ar: longBio };
    const prompt = buildTaglinePrompt(ctx);
    // Ensure the prompt is produced and doesn't contain 800+ identical chars in sequence
    const bioSection = prompt.split("نبذة المستقل:")[1] ?? "";
    const bioContent = bioSection.split("\n")[0] ?? "";
    expect(bioContent.length).toBeLessThanOrEqual(410); // 400 + label overhead
  });

  it("returns a non-empty string", () => {
    const prompt = buildTaglinePrompt(BASE_CTX);
    expect(typeof prompt).toBe("string");
    expect(prompt.length).toBeGreaterThan(50);
  });
});
