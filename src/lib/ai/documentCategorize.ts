import "server-only";
import { generateObject } from "ai";
import { z } from "zod";
import { deepseek, REASONING_MODEL } from "@/lib/ai/client";

const CATEGORY_IDS = [
  "freelance_doc",
  "commercial_reg",
  "tax_cert",
  "contract",
  "portfolio",
  "nda",
  "other",
] as const;

const CategorizeSchema = z.object({
  category: z.enum(CATEGORY_IDS),
  confidence: z.number().min(0).max(1),
});

export type CategorizationCtx = {
  filename: string;
  file_type: string;
  title?: string;
  description?: string;
};

export function buildCategorizePrompt(ctx: CategorizationCtx): string {
  return `You are a document classifier for Saudi freelancers. Based ONLY on the filename, MIME type, and any user-supplied title/description, classify the document into one of these 7 category IDs:
- freelance_doc: freelance license / work permit document
- commercial_reg: commercial registration (سجل تجاري)
- tax_cert: tax certificate / VAT certificate (شهادة ضريبية)
- contract: any contract or agreement (عقد)
- portfolio: portfolio / work samples (أعمال)
- nda: NDA / confidentiality agreement (اتفاقية عدم إفصاح)
- other: anything else

INPUTS (text-only, no file content):
- Filename: ${ctx.filename}
- MIME type: ${ctx.file_type}
${ctx.title ? `- Title: ${ctx.title}` : ""}
${ctx.description ? `- Description: ${ctx.description}` : ""}

Return the single best category ID and a confidence score 0..1.
If uncertain, choose "other" with lower confidence rather than guessing.`;
}

export async function categorizeDocument(
  ctx: CategorizationCtx
): Promise<{ category: (typeof CATEGORY_IDS)[number]; confidence: number } | null> {
  const prompt = buildCategorizePrompt(ctx);
  try {
    const result = await generateObject({
      model: deepseek(REASONING_MODEL),
      schema: CategorizeSchema,
      prompt,
      abortSignal: AbortSignal.timeout(8_000),
    });
    return result.object;
  } catch (err) {
    console.error("[categorizeDocument] failed", err);
    return null;
  }
}
