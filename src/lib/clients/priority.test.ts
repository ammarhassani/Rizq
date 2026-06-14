import { describe, it, expect } from "vitest";
import { scoreFollowUpPriority, defaultNextAction, type PriorityInput } from "./priority";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mkInput(overrides: Partial<PriorityInput> = {}): PriorityInput {
  return {
    daysSinceContact: 10,
    totalValueSar: 1_000,
    avgPaymentDays: 14,
    hasActiveProposal: false,
    ...overrides,
  };
}

// ─── scoreFollowUpPriority ───────────────────────────────────────────────────

describe("scoreFollowUpPriority", () => {
  // ── HIGH: never contacted ────────────────────────────────────────────────
  it("returns high when daysSinceContact is null (never contacted)", () => {
    expect(scoreFollowUpPriority(mkInput({ daysSinceContact: null }))).toBe("high");
  });

  // ── HIGH: active proposal override ──────────────────────────────────────
  it("returns high when hasActiveProposal=true even if contact is very recent", () => {
    expect(
      scoreFollowUpPriority(mkInput({ daysSinceContact: 1, hasActiveProposal: true }))
    ).toBe("high");
  });

  it("returns high when hasActiveProposal=true and 13 days since contact", () => {
    expect(
      scoreFollowUpPriority(mkInput({ daysSinceContact: 13, hasActiveProposal: true }))
    ).toBe("high");
  });

  it("returns high when hasActiveProposal=true and 45 days since contact", () => {
    expect(
      scoreFollowUpPriority(mkInput({ daysSinceContact: 45, hasActiveProposal: true }))
    ).toBe("high");
  });

  // ── HIGH: cold (> 45 days) ───────────────────────────────────────────────
  it("returns high when daysSinceContact is exactly 46", () => {
    expect(scoreFollowUpPriority(mkInput({ daysSinceContact: 46 }))).toBe("high");
  });

  it("returns high when daysSinceContact is 60 (very cold)", () => {
    expect(scoreFollowUpPriority(mkInput({ daysSinceContact: 60 }))).toBe("high");
  });

  it("returns high when daysSinceContact is 100 (extremely cold)", () => {
    expect(scoreFollowUpPriority(mkInput({ daysSinceContact: 100 }))).toBe("high");
  });

  // ── Boundary: 45 days exactly (NOT > 45 → not cold-high on its own)
  it("returns medium when daysSinceContact is exactly 45 and low value, no proposal", () => {
    expect(
      scoreFollowUpPriority(mkInput({ daysSinceContact: 45, totalValueSar: 1_000 }))
    ).toBe("medium");
  });

  // ── HIGH: high-value going warm (> 30 days, >= 5000 SAR) ────────────────
  it("returns high when daysSinceContact=31 and totalValueSar=5000 (boundary)", () => {
    expect(
      scoreFollowUpPriority(mkInput({ daysSinceContact: 31, totalValueSar: 5_000 }))
    ).toBe("high");
  });

  it("returns high when daysSinceContact=45 and totalValueSar=10000 (high-value, warm)", () => {
    expect(
      scoreFollowUpPriority(mkInput({ daysSinceContact: 45, totalValueSar: 10_000 }))
    ).toBe("high");
  });

  it("returns medium when daysSinceContact=31 and totalValueSar=4999 (below high-value threshold)", () => {
    expect(
      scoreFollowUpPriority(mkInput({ daysSinceContact: 31, totalValueSar: 4_999 }))
    ).toBe("medium");
  });

  it("returns medium when daysSinceContact=30 exactly and totalValueSar=10000 (NOT > 30)", () => {
    // Rule is daysSinceContact > WARM_DAYS (30), so exactly 30 is not triggered
    expect(
      scoreFollowUpPriority(mkInput({ daysSinceContact: 30, totalValueSar: 10_000 }))
    ).toBe("medium");
  });

  // ── LOW: recent contact, no active proposal ──────────────────────────────
  it("returns low when daysSinceContact=0 and no active proposal", () => {
    expect(scoreFollowUpPriority(mkInput({ daysSinceContact: 0 }))).toBe("low");
  });

  it("returns low when daysSinceContact=1 and no active proposal", () => {
    expect(scoreFollowUpPriority(mkInput({ daysSinceContact: 1 }))).toBe("low");
  });

  it("returns low when daysSinceContact=13 (just under 14 boundary)", () => {
    expect(scoreFollowUpPriority(mkInput({ daysSinceContact: 13 }))).toBe("low");
  });

  // Boundary: 14 days exactly is NOT < 14, so it is medium
  it("returns medium when daysSinceContact=14 exactly and no active proposal", () => {
    expect(scoreFollowUpPriority(mkInput({ daysSinceContact: 14 }))).toBe("medium");
  });

  // ── MEDIUM: 14–30 days ──────────────────────────────────────────────────
  it("returns medium when daysSinceContact=15 and no active proposal", () => {
    expect(scoreFollowUpPriority(mkInput({ daysSinceContact: 15 }))).toBe("medium");
  });

  it("returns medium when daysSinceContact=20 and no active proposal", () => {
    expect(scoreFollowUpPriority(mkInput({ daysSinceContact: 20 }))).toBe("medium");
  });

  it("returns medium when daysSinceContact=30 (boundary) and no active proposal", () => {
    expect(scoreFollowUpPriority(mkInput({ daysSinceContact: 30 }))).toBe("medium");
  });

  // ── MEDIUM: 31–45 days, low value, no proposal ──────────────────────────
  it("returns medium when daysSinceContact=35, totalValueSar=1000, no active proposal", () => {
    expect(
      scoreFollowUpPriority(mkInput({ daysSinceContact: 35, totalValueSar: 1_000 }))
    ).toBe("medium");
  });

  // avgPaymentDays does not affect priority in current rules
  it("slow payment days alone do not change priority (medium baseline)", () => {
    expect(
      scoreFollowUpPriority(mkInput({ daysSinceContact: 20, avgPaymentDays: 90 }))
    ).toBe("medium");
  });
});

// ─── defaultNextAction ───────────────────────────────────────────────────────

describe("defaultNextAction", () => {
  it("returns Arabic text for high+null in Arabic locale", () => {
    const result = defaultNextAction("high", null, "ar");
    expect(result.length).toBeGreaterThan(5);
    // Should mention reaching out (تواصل)
    expect(result).toContain("تواصل");
  });

  it("returns English text for high+null in English locale", () => {
    const result = defaultNextAction("high", null, "en");
    expect(result).toContain("first time");
  });

  it("returns cold-contact message when high and > 45 days", () => {
    const result = defaultNextAction("high", 50, "ar");
    expect(result).toContain("وقت طويل");
  });

  it("returns proposal follow-up message when high and contact within 45 days (implies proposal)", () => {
    const result = defaultNextAction("high", 20, "ar");
    expect(result).toContain("العرض");
  });

  it("returns medium Arabic text", () => {
    const result = defaultNextAction("medium", 20, "ar");
    expect(result.length).toBeGreaterThan(5);
    expect(result).toContain("تابع");
  });

  it("returns medium English text", () => {
    const result = defaultNextAction("medium", 20, "en");
    expect(result).toContain("Follow up");
  });

  it("returns low Arabic text", () => {
    const result = defaultNextAction("low", 5, "ar");
    expect(result).toContain("حديث");
  });

  it("returns low English text", () => {
    const result = defaultNextAction("low", 5, "en");
    expect(result).toContain("recent");
  });
});
