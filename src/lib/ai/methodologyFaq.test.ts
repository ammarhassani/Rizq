/**
 * Unit tests for buildMethodologyFaqPrompt — pure function, no AI network call needed.
 *
 * Verifies:
 * 1. Out-of-scope refusal phrase is present in the prompt instructions.
 * 2. Arabic-language directive is included.
 * 3. The question appears in the prompt.
 * 4. The sections text is embedded in the prompt.
 * 5. No-fabrication instruction is present.
 */

import { describe, it, expect } from "vitest";
import { buildMethodologyFaqPrompt } from "./methodologyFaq";

const SAMPLE_SECTIONS = `### كيف نجمع البيانات / How we collect data
تعتمد أسعار رِزق على ثلاثة مصادر مستقلة.
Rizq's rates draw on three independent sources.

### التقديرات المنطقية / Reasoned priors
يولّد رِزق تقديرًا أوّليًا باستخدام نموذج ذكاء اصطناعي.
Rizq generates a reasoned estimate using an AI model.`;

describe("buildMethodologyFaqPrompt", () => {
  it("includes the out-of-scope Arabic refusal phrase verbatim", () => {
    const prompt = buildMethodologyFaqPrompt("أي سؤال؟", SAMPLE_SECTIONS);
    expect(prompt).toContain("هذا السؤال خارج نطاق المنهجية المنشورة");
  });

  it("includes an Arabic-language response directive", () => {
    const prompt = buildMethodologyFaqPrompt("any question", SAMPLE_SECTIONS);
    expect(prompt).toContain("أجب بالعربية");
  });

  it("embeds the user's question in the prompt", () => {
    const question = "كيف تحسبون الوسيط؟";
    const prompt = buildMethodologyFaqPrompt(question, SAMPLE_SECTIONS);
    expect(prompt).toContain(question);
  });

  it("embeds the sections text in the prompt", () => {
    const prompt = buildMethodologyFaqPrompt("test", SAMPLE_SECTIONS);
    expect(prompt).toContain("كيف نجمع البيانات");
    expect(prompt).toContain("Rizq's rates draw on three independent sources");
  });

  it("instructs the AI not to fabricate information", () => {
    const prompt = buildMethodologyFaqPrompt("test", SAMPLE_SECTIONS);
    expect(prompt).toContain("لا تخترع");
  });

  it("instructs the AI to cite the relevant section", () => {
    const prompt = buildMethodologyFaqPrompt("test", SAMPLE_SECTIONS);
    expect(prompt).toContain("القسم");
  });

  it("includes English fallback instruction when question is in English", () => {
    const prompt = buildMethodologyFaqPrompt("How do you compute the median?", SAMPLE_SECTIONS);
    // The prompt should include the English-response directive
    expect(prompt).toContain("أجب بالإنجليزية");
  });

  it("handles empty sections text without throwing", () => {
    expect(() => buildMethodologyFaqPrompt("test question", "")).not.toThrow();
  });

  it("includes a length / brevity instruction", () => {
    const prompt = buildMethodologyFaqPrompt("test", SAMPLE_SECTIONS);
    // The prompt should cap the answer length
    expect(prompt).toContain("5");
  });
});
