/**
 * Pure prompt-builder tests for paymentReminder.ts — spec M6.4-B.
 *
 * Tests ONLY the pure buildPaymentReminderPrompt function (no AI calls, no mocking).
 * Per Vitest 4 guidance: we do not write tests that mock the AI call rejecting.
 */

import { describe, it, expect } from "vitest";
import { buildPaymentReminderPrompt } from "./paymentReminder";
import type { PaymentReminderCtx } from "./paymentReminder";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const baseCtx: PaymentReminderCtx = {
  invoiceNumber: "INV-2026-0042",
  totalSar: 5750,
  dueDate: "2026-05-01",
  daysOverdue: 14,
  clientName: "محمد القحطاني",
  clientCompany: "مؤسسة الإبداع السعودي",
  paymentDetails: "IBAN: SA0380000000608010167519",
  tone: "balanced",
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("buildPaymentReminderPrompt", () => {
  it("includes the invoice number in the prompt", () => {
    const prompt = buildPaymentReminderPrompt(baseCtx);
    expect(prompt).toContain("INV-2026-0042");
  });

  it("includes the formatted total amount", () => {
    const prompt = buildPaymentReminderPrompt(baseCtx);
    expect(prompt).toContain("5,750");
    expect(prompt).toContain("ر.س");
  });

  it("includes the due date when provided", () => {
    const prompt = buildPaymentReminderPrompt(baseCtx);
    expect(prompt).toContain("2026-05-01");
  });

  it("includes the days overdue count", () => {
    const prompt = buildPaymentReminderPrompt(baseCtx);
    expect(prompt).toContain("14");
    expect(prompt).toContain("يوم");
  });

  it("includes the client name when provided", () => {
    const prompt = buildPaymentReminderPrompt(baseCtx);
    expect(prompt).toContain("محمد القحطاني");
  });

  it("includes the client company when provided", () => {
    const prompt = buildPaymentReminderPrompt(baseCtx);
    expect(prompt).toContain("مؤسسة الإبداع السعودي");
  });

  it("includes payment details when provided", () => {
    const prompt = buildPaymentReminderPrompt(baseCtx);
    expect(prompt).toContain("IBAN: SA0380000000608010167519");
  });

  it("contains the Arabic no-fabrication guard", () => {
    const prompt = buildPaymentReminderPrompt(baseCtx);
    expect(prompt).toContain("لا تخترع معلومات غير موجودة");
  });

  it("contains the English no-fabrication guard", () => {
    const prompt = buildPaymentReminderPrompt(baseCtx);
    expect(prompt).toContain("do not invent information not provided");
  });

  it("contains an Arabic instruction to write the reminder", () => {
    const prompt = buildPaymentReminderPrompt(baseCtx);
    expect(prompt).toContain("اكتب رسالة التذكير");
  });

  it("mentions WhatsApp readiness", () => {
    const prompt = buildPaymentReminderPrompt(baseCtx);
    expect(prompt).toContain("واتساب");
  });

  it("enforces 2–3 sentence limit", () => {
    const prompt = buildPaymentReminderPrompt(baseCtx);
    expect(prompt).toContain("2–3");
  });

  it("uses balanced tone instruction", () => {
    const prompt = buildPaymentReminderPrompt({ ...baseCtx, tone: "balanced" });
    expect(prompt).toContain("متوازنة");
  });

  it("uses formal tone instruction when tone is formal", () => {
    const prompt = buildPaymentReminderPrompt({ ...baseCtx, tone: "formal" });
    expect(prompt).toContain("رسمية");
  });

  it("uses friendly tone instruction when tone is friendly", () => {
    const prompt = buildPaymentReminderPrompt({ ...baseCtx, tone: "friendly" });
    expect(prompt).toContain("ودية");
  });

  it("handles null clientName gracefully", () => {
    const ctx: PaymentReminderCtx = { ...baseCtx, clientName: null, clientCompany: null };
    const prompt = buildPaymentReminderPrompt(ctx);
    expect(prompt).toContain("العميل الكريم");
  });

  it("handles null dueDate gracefully", () => {
    const ctx: PaymentReminderCtx = { ...baseCtx, dueDate: null };
    const prompt = buildPaymentReminderPrompt(ctx);
    expect(prompt).toContain("غير محدد");
  });

  it("handles null paymentDetails gracefully", () => {
    const ctx: PaymentReminderCtx = { ...baseCtx, paymentDetails: null };
    const prompt = buildPaymentReminderPrompt(ctx);
    expect(prompt).toContain("يرجى التواصل معي");
  });

  it("formats large amounts with commas", () => {
    const ctx: PaymentReminderCtx = { ...baseCtx, totalSar: 22500 };
    const prompt = buildPaymentReminderPrompt(ctx);
    expect(prompt).toContain("22,500");
  });

  it("returns a non-empty string", () => {
    const prompt = buildPaymentReminderPrompt(baseCtx);
    expect(typeof prompt).toBe("string");
    expect(prompt.length).toBeGreaterThan(100);
  });
});
