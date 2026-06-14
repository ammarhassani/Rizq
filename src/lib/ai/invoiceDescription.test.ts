/**
 * Pure prompt-builder tests for invoiceDescription.ts — spec M6.4-A.
 *
 * Tests ONLY the pure buildInvoiceDescriptionPrompt function (no AI calls, no mocking).
 * Per Vitest 4 guidance: we do not write tests that mock the AI call rejecting.
 */

import { describe, it, expect } from "vitest";
import { buildInvoiceDescriptionPrompt } from "./invoiceDescription";
import type { InvoiceDescriptionCtx } from "./invoiceDescription";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const baseCtx: InvoiceDescriptionCtx = {
  gigTitle: "تصميم هوية بصرية",
  gigDescription: "تصميم شعار وألوان وخطوط مناسبة للشركة مع تسليم ملفات المصدر",
  amountSar: 3500,
  clientName: "أحمد الزهراني",
  clientCompany: "شركة الأفق للتقنية",
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("buildInvoiceDescriptionPrompt", () => {
  it("includes the gig title in the prompt", () => {
    const prompt = buildInvoiceDescriptionPrompt(baseCtx);
    expect(prompt).toContain("تصميم هوية بصرية");
  });

  it("includes the gig description when provided", () => {
    const prompt = buildInvoiceDescriptionPrompt(baseCtx);
    expect(prompt).toContain("تصميم شعار وألوان وخطوط مناسبة للشركة");
  });

  it("includes the formatted amount in the prompt", () => {
    const prompt = buildInvoiceDescriptionPrompt(baseCtx);
    expect(prompt).toContain("3,500");
    expect(prompt).toContain("ر.س");
  });

  it("includes the client name when provided", () => {
    const prompt = buildInvoiceDescriptionPrompt(baseCtx);
    expect(prompt).toContain("أحمد الزهراني");
  });

  it("includes the client company when provided", () => {
    const prompt = buildInvoiceDescriptionPrompt(baseCtx);
    expect(prompt).toContain("شركة الأفق للتقنية");
  });

  it("contains the Arabic no-fabrication guard", () => {
    const prompt = buildInvoiceDescriptionPrompt(baseCtx);
    expect(prompt).toContain("لا تخترع مخرجات غير مذكورة");
  });

  it("contains the English no-fabrication guard", () => {
    const prompt = buildInvoiceDescriptionPrompt(baseCtx);
    expect(prompt).toContain("do not invent deliverables not provided");
  });

  it("contains an Arabic instruction directive", () => {
    const prompt = buildInvoiceDescriptionPrompt(baseCtx);
    expect(prompt).toContain("اكتب وصفًا");
  });

  it("requests both ar and en fields", () => {
    const prompt = buildInvoiceDescriptionPrompt(baseCtx);
    expect(prompt).toContain("ar");
    expect(prompt).toContain("en");
  });

  it("handles null clientName gracefully", () => {
    const ctx: InvoiceDescriptionCtx = { ...baseCtx, clientName: null, clientCompany: null };
    const prompt = buildInvoiceDescriptionPrompt(ctx);
    expect(prompt).toContain("غير محدد");
  });

  it("handles null gigDescription gracefully", () => {
    const ctx: InvoiceDescriptionCtx = { ...baseCtx, gigDescription: null };
    const prompt = buildInvoiceDescriptionPrompt(ctx);
    expect(prompt).toContain("غير متوفرة");
  });

  it("formats large amounts with commas", () => {
    const ctx: InvoiceDescriptionCtx = { ...baseCtx, amountSar: 15000 };
    const prompt = buildInvoiceDescriptionPrompt(ctx);
    expect(prompt).toContain("15,000");
  });

  it("returns a non-empty string", () => {
    const prompt = buildInvoiceDescriptionPrompt(baseCtx);
    expect(typeof prompt).toBe("string");
    expect(prompt.length).toBeGreaterThan(100);
  });
});
