import { describe, it, expect } from "vitest";
import { buildBusinessInsightsPrompt, buildDeterministicInsights, stripEmDashes } from "./businessInsights";
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

  it("instructs the model not to use em dashes", () => {
    const prompt = buildBusinessInsightsPrompt(baseCtx);
    expect(prompt).toContain("الشرطة الطويلة");
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

describe("buildDeterministicInsights (AI fallback)", () => {
  it("derives facts from the data: income, deadlines, top client, proposals", () => {
    const insights = buildDeterministicInsights(baseCtx);
    expect(insights.length).toBeGreaterThan(0);
    expect(insights.length).toBeLessThanOrEqual(4);

    const income = insights.find((i) => i.kind === "income");
    expect(income?.ar).toContain("15,000"); // latest month total, grouped

    const client = insights.find((i) => i.kind === "client");
    expect(client?.ar).toContain("شركة نور"); // highest total_value_sar
    expect(client?.en).toContain("35,000");

    const proposal = insights.find((i) => i.kind === "proposal");
    expect(proposal?.ar).toContain("2"); // 2 proposals in 30d
  });

  it("every insight carries both ar and en (no fabricated empties)", () => {
    for (const i of buildDeterministicInsights(baseCtx)) {
      expect(i.ar.trim().length).toBeGreaterThan(0);
      expect(i.en.trim().length).toBeGreaterThan(0);
    }
  });

  it("returns an empty array when there is no data (no throws)", () => {
    const empty: BusinessInsightsCtx = { proposals: [], gigs: [], clients: [], income: [], deadlines: [] };
    expect(buildDeterministicInsights(empty)).toEqual([]);
  });

  it("never emits em or en dashes", () => {
    for (const i of buildDeterministicInsights(baseCtx)) {
      expect(i.ar).not.toMatch(/[—–]/);
      expect(i.en).not.toMatch(/[—–]/);
    }
  });

  it("flags overdue invoices when present", () => {
    const ctx: BusinessInsightsCtx = {
      ...baseCtx,
      deadlines: [
        { type: "invoice", title: "ف-1", date: "2026-06-01", status: "overdue" },
        { type: "invoice", title: "ف-2", date: "2026-06-25", status: "sent" },
      ],
    };
    const deadline = buildDeterministicInsights(ctx).find((i) => i.kind === "deadline");
    expect(deadline?.en).toContain("overdue");
  });
});

describe("stripEmDashes", () => {
  it("replaces a spaced em dash with a comma (en) and Arabic comma (ar)", () => {
    expect(stripEmDashes("an automated insight — not advice", "en")).toBe("an automated insight, not advice");
    expect(stripEmDashes("تحليل آلي — ليس استشارة", "ar")).toBe("تحليل آلي، ليس استشارة");
  });

  it("handles en dashes too and collapses extra spaces", () => {
    expect(stripEmDashes("a – b", "en")).toBe("a, b");
  });

  it("leaves regular hyphens in ranges untouched", () => {
    expect(stripEmDashes("1000-1500 SAR", "en")).toBe("1000-1500 SAR");
  });
});
