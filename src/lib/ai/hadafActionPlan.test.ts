/**
 * Unit tests for buildHadafActionPlanPrompt — pure function, no AI needed.
 * Verifies that the prompt contains required labeling, data references,
 * and NEVER fabricates guarantees.
 */

import { describe, it, expect } from "vitest";
import { buildHadafActionPlanPrompt } from "./hadafActionPlan";
import type { HadafActionPlanCtx } from "./hadafActionPlan";

const BASE_CTX: HadafActionPlanCtx = {
  current_income: 400,
  target_income: 700,
  days_remaining_in_month: 15,
  active_proposals: [],
  in_progress_gigs: [],
  clients_needing_followup: [],
  avg_3mo_income: null,
};

describe("buildHadafActionPlanPrompt", () => {
  it("includes the mandatory Arabic disclaimer label", () => {
    const prompt = buildHadafActionPlanPrompt(BASE_CTX);
    expect(prompt).toContain("ليست نصيحة مالية");
  });

  it("includes the English disclaimer label", () => {
    const prompt = buildHadafActionPlanPrompt(BASE_CTX);
    expect(prompt).toContain("not financial advice");
  });

  it("includes current income in the prompt", () => {
    const prompt = buildHadafActionPlanPrompt(BASE_CTX);
    expect(prompt).toContain("400");
  });

  it("includes target income in the prompt", () => {
    const prompt = buildHadafActionPlanPrompt(BASE_CTX);
    expect(prompt).toContain("700");
  });

  it("computes and includes the income gap", () => {
    const prompt = buildHadafActionPlanPrompt(BASE_CTX);
    // gap = 700 - 400 = 300
    expect(prompt).toContain("300");
  });

  it("includes days remaining in the prompt", () => {
    const prompt = buildHadafActionPlanPrompt(BASE_CTX);
    expect(prompt).toContain("15");
  });

  it("includes active proposal client name and price when provided", () => {
    const ctx: HadafActionPlanCtx = {
      ...BASE_CTX,
      active_proposals: [
        { title: "تصميم شعار", price_anchor: 1500, client: "شركة النور", days_since_sent: 5 },
      ],
    };
    const prompt = buildHadafActionPlanPrompt(ctx);
    expect(prompt).toContain("شركة النور");
    expect(prompt).toContain("1500");
    expect(prompt).toContain("تصميم شعار");
  });

  it("includes in-progress gig title and amount", () => {
    const ctx: HadafActionPlanCtx = {
      ...BASE_CTX,
      in_progress_gigs: [{ title: "موقع إلكتروني", amount_sar: 3000 }],
    };
    const prompt = buildHadafActionPlanPrompt(ctx);
    expect(prompt).toContain("موقع إلكتروني");
    expect(prompt).toContain("3000");
  });

  it("includes client needing follow-up by name", () => {
    const ctx: HadafActionPlanCtx = {
      ...BASE_CTX,
      clients_needing_followup: [{ name: "أحمد العمري", days_since_contact: 35 }],
    };
    const prompt = buildHadafActionPlanPrompt(ctx);
    expect(prompt).toContain("أحمد العمري");
    expect(prompt).toContain("35");
  });

  it("includes avg_3mo_income when provided", () => {
    const ctx: HadafActionPlanCtx = { ...BASE_CTX, avg_3mo_income: 550 };
    const prompt = buildHadafActionPlanPrompt(ctx);
    expect(prompt).toContain("550");
  });

  it("shows no-data line when avg_3mo_income is null", () => {
    const prompt = buildHadafActionPlanPrompt(BASE_CTX);
    expect(prompt).toContain("لا يوجد متوسط دخل متاح");
  });

  it("includes no-proposals fallback when proposal list is empty", () => {
    const prompt = buildHadafActionPlanPrompt(BASE_CTX);
    expect(prompt).toContain("لا توجد عروض مُرسَلة");
  });

  it("includes no-gigs fallback when gig list is empty", () => {
    const prompt = buildHadafActionPlanPrompt(BASE_CTX);
    expect(prompt).toContain("لا توجد مشاريع قيد التنفيذ");
  });

  it("includes no-followup fallback when client list is empty", () => {
    const prompt = buildHadafActionPlanPrompt(BASE_CTX);
    expect(prompt).toContain("لا يوجد عملاء يحتاجون متابعة");
  });

  it("instructs AI to NOT guarantee eligibility", () => {
    const prompt = buildHadafActionPlanPrompt(BASE_CTX);
    expect(prompt).toContain("لا تضمن الأهلية");
  });

  it("handles gap = 0 correctly when already at target", () => {
    const ctx: HadafActionPlanCtx = {
      ...BASE_CTX,
      current_income: 700,
      target_income: 700,
    };
    const prompt = buildHadafActionPlanPrompt(ctx);
    // gap should be 0
    expect(prompt).toContain("الفجوة المتبقية: 0 ريال");
  });

  it("handles client with null days_since_contact gracefully", () => {
    const ctx: HadafActionPlanCtx = {
      ...BASE_CTX,
      clients_needing_followup: [{ name: "سارة الخالدي", days_since_contact: null }],
    };
    const prompt = buildHadafActionPlanPrompt(ctx);
    expect(prompt).toContain("سارة الخالدي");
    expect(prompt).toContain("لم يتم التواصل مسبقًا");
  });
});
