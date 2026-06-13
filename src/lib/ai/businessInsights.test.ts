import { describe, it, expect } from "vitest";
import { buildBusinessInsightsPrompt } from "./businessInsights";
import type { BusinessInsightsCtx } from "./businessInsights";

const baseCtx: BusinessInsightsCtx = {
  proposals: [
    { title: "تصميم موقع", clientName: "شركة نور", status: "accepted", amount: 8000, date: "2026-06-01" },
    { title: "هوية بصرية", clientName: "مؤسسة البدر", status: "declined", amount: 4500, date: "2026-05-20" },
  ],
  gigs: [
    { title: "شعار", status: "paid", amount_sar: 3000, date: "2026-05-10" },
    { title: "تطوير متجر", status: "pending", amount_sar: 12000, date: "2026-06-15" },
  ],
  clients: [
    { name: "شركة نور", total_gigs: 5, total_value_sar: 35000, last_contacted_at: "2026-06-10" },
    { name: "مؤسسة البدر", total_gigs: 1, total_value_sar: 4500, last_contacted_at: "2026-03-01" },
  ],
  income: [
    { month: "2026-06-01", total_sar: 15000, paid_sar: 3000, pending_sar: 12000 },
    { month: "2026-05-01", total_sar: 7500, paid_sar: 7500, pending_sar: 0 },
  ],
  deadlines: [
    { type: "invoice", title: "فاتورة رقم 12", date: "2026-06-20", status: "sent" },
  ],
};

describe("buildBusinessInsightsPrompt", () => {
  it("includes income figures from ctx", () => {
    const prompt = buildBusinessInsightsPrompt(baseCtx);
    expect(prompt).toContain("15000");
    expect(prompt).toContain("7500");
  });

  it("includes proposal details from ctx", () => {
    const prompt = buildBusinessInsightsPrompt(baseCtx);
    expect(prompt).toContain("تصميم موقع");
    expect(prompt).toContain("8000");
    expect(prompt).toContain("شركة نور");
  });

  it("includes client names and totals", () => {
    const prompt = buildBusinessInsightsPrompt(baseCtx);
    expect(prompt).toContain("شركة نور");
    expect(prompt).toContain("35000");
  });

  it("contains no-fabrication guard directive", () => {
    const prompt = buildBusinessInsightsPrompt(baseCtx);
    expect(prompt).toContain("لا تخترع");
  });

  it("contains Arabic-output directive", () => {
    const prompt = buildBusinessInsightsPrompt(baseCtx);
    expect(prompt).toContain("ar");
    // The prompt must instruct Arabic output
    expect(prompt).toMatch(/العربية|ar.*en|بالعربية/);
  });

  it("contains the honesty-label requirement", () => {
    const prompt = buildBusinessInsightsPrompt(baseCtx);
    expect(prompt).toContain("ليس استشارة مهنية");
  });

  it("handles empty ctx gracefully (no throws)", () => {
    const empty: BusinessInsightsCtx = {
      proposals: [],
      gigs: [],
      clients: [],
      income: [],
      deadlines: [],
    };
    expect(() => buildBusinessInsightsPrompt(empty)).not.toThrow();
    const prompt = buildBusinessInsightsPrompt(empty);
    expect(prompt).toContain("لا توجد عروض");
    expect(prompt).toContain("لا يوجد عملاء");
  });
});
