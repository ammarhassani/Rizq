/**
 * Income anomaly explanation — spec M3.6-B.
 * Called ONLY when isPriceAnomaly() has already flagged a gig.
 * Generates a short bilingual explanation of why the amount looks unusual.
 * Server-only (uses AI SDK).
 */
import "server-only";
import { generateObject } from "ai";
import { z } from "zod";
import { deepseek, REASONING_MODEL } from "@/lib/ai/client";

export type AnomalyExplanation = {
  reason_ar: string;
  reason_en: string;
};

export type ExplainAnomalyInput = {
  category: string;
  avg: number;   // average amount_sar for this category
  min: number;   // min amount_sar for this category
  max: number;   // max amount_sar for this category
  amount: number; // the flagged gig's amount
  title: string;  // gig title for context
};

const AnomalySchema = z.object({
  reason_ar: z.string().min(1),
  reason_en: z.string().min(1),
});

/**
 * Returns a short bilingual explanation of a price anomaly, prefixed with the
 * Rizq insight label, or null on failure.
 */
export async function explainAnomaly(
  input: ExplainAnomalyInput
): Promise<AnomalyExplanation | null> {
  const prompt = buildPrompt(input);
  try {
    const result = await generateObject({
      model: deepseek(REASONING_MODEL),
      schema: AnomalySchema,
      prompt,
      abortSignal: AbortSignal.timeout(10_000),
    });
    const { reason_ar, reason_en } = result.object;
    return {
      reason_ar: `تحليل رِزق — ${reason_ar}`,
      reason_en: `Rizq Insight — ${reason_en}`,
    };
  } catch (err) {
    console.error("[explainAnomaly] failed", err);
    return null;
  }
}

function buildPrompt(input: ExplainAnomalyInput): string {
  const { category, avg, min, max, amount, title } = input;
  const deviationPct = avg > 0 ? Math.round(((amount - avg) / avg) * 100) : 0;
  const direction = amount > avg ? "above" : "below";

  return `You are a pricing advisor for Saudi freelancers (Rizq / رِزق).
A gig has been flagged as a price anomaly — its amount deviates significantly from
the freelancer's typical rate for this category.

Gig title: """${title}"""
Category: ${category}
Flagged amount: ${amount} SAR
Freelancer's average for this category: ${avg} SAR
Range (min–max): ${min}–${max} SAR
Deviation: ${Math.abs(deviationPct)}% ${direction} average

Write a SHORT (1–2 sentences) bilingual explanation of why this price stands out,
in a polite, advisory Saudi tone. Possible reasons: unusually high (premium project,
rush fee, corporate client), unusually low (discount, under-pricing, data entry error).
Don't invent facts not shown above. Be concise.

reason_ar: Arabic explanation (1–2 sentences).
reason_en: English explanation (1–2 sentences).`;
}
