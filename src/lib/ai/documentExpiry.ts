import "server-only";
import { generateObject } from "ai";
import { z } from "zod";
import { deepseek, REASONING_MODEL } from "@/lib/ai/client";

const ExpirySchema = z.object({
  expiry_date: z.string().nullable(),  // ISO date YYYY-MM-DD or null
  confidence: z.number().min(0).max(1),
});

export type ExpiryCtx = {
  title: string;
  description?: string;
  category?: string;
};

export function buildExpiryPrompt(ctx: ExpiryCtx): string {
  return `You are an assistant for Saudi freelancers. Based on the document title, optional description, and category, infer whether this document likely has an expiry date and what it might be.

INPUTS (text-only, no file content):
- Title: ${ctx.title}
${ctx.description ? `- Description: ${ctx.description}` : ""}
${ctx.category ? `- Category: ${ctx.category}` : ""}

RULES:
- Return a date in YYYY-MM-DD format if you can infer a reasonable expiry (e.g. annual tax certs, freelance licenses valid 1 year, NDAs with stated durations).
- Return null if there's no clear basis for inferring an expiry.
- confidence: 0..1 reflecting how certain you are. Keep confidence low (< 0.4) when inferring from category alone.
- Today's approximate date: ${new Date().toISOString().split("T")[0]}
- NEVER fabricate a specific date you cannot logically derive from the inputs.

Return expiry_date (YYYY-MM-DD or null) and confidence.`;
}

export async function detectDocumentExpiry(
  ctx: ExpiryCtx
): Promise<{ expiry_date: string | null; confidence: number } | null> {
  const prompt = buildExpiryPrompt(ctx);
  try {
    const result = await generateObject({
      model: deepseek(REASONING_MODEL),
      schema: ExpirySchema,
      prompt,
      abortSignal: AbortSignal.timeout(8_000),
    });
    return result.object;
  } catch (err) {
    console.error("[detectDocumentExpiry] failed", err);
    return null;
  }
}
