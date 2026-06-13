/**
 * Income category suggestion — spec M3.6-A.
 * Given a gig title + optional context, asks DeepSeek to suggest the best
 * billing category in Arabic + English with a confidence score.
 * Server-only (uses AI SDK).
 */
import "server-only";
import { generateObject } from "ai";
import { z } from "zod";
import { deepseek, REASONING_MODEL } from "@/lib/ai/client";

export type CategorySuggestion = {
  category_ar: string;
  category_en: string;
  confidence: number; // 0..1
};

const CategorySchema = z.object({
  category_ar: z.string().min(1),
  category_en: z.string().min(1),
  confidence: z.number().min(0).max(1),
});

export type SuggestCategoryInput = {
  title: string;
  specialties?: string[];      // user's saved specialties (best-effort)
  pastCategories?: string[];   // distinct categories the user has used before
};

/**
 * Returns a bilingual category suggestion for the given gig title, or null on failure.
 * Caller should treat confidence < 0.6 as a dim hint rather than auto-apply.
 */
export async function suggestCategory(
  input: SuggestCategoryInput
): Promise<CategorySuggestion | null> {
  const { title, specialties = [], pastCategories = [] } = input;
  const prompt = buildPrompt(title, specialties, pastCategories);
  try {
    const result = await generateObject({
      model: deepseek(REASONING_MODEL),
      schema: CategorySchema,
      prompt,
      abortSignal: AbortSignal.timeout(10_000),
    });
    return result.object;
  } catch (err) {
    console.error("[suggestCategory] failed", err);
    return null;
  }
}

function buildPrompt(
  title: string,
  specialties: string[],
  pastCategories: string[]
): string {
  const specialtiesLine = specialties.length
    ? `User's specialties: ${specialties.join(", ")}`
    : "User's specialties: unknown";

  const pastLine = pastCategories.length
    ? `User's past categories (prefer reusing if a good fit): ${pastCategories.join(", ")}`
    : "User's past categories: none";

  return `You are a billing category assistant for a Saudi freelancer app (Rizq / رِزق).
Given a gig title, suggest the most appropriate billing category in both Arabic and English,
with a confidence score from 0 to 1.

${specialtiesLine}
${pastLine}

Rules:
- category_ar: short Arabic category name (2–4 words), e.g. "تصميم جرافيك", "تطوير مواقع", "كتابة محتوى".
- category_en: matching English category name (2–4 words), e.g. "Graphic Design", "Web Development", "Content Writing".
- confidence: how confident you are (0..1). Use < 0.6 only when the title is ambiguous.
- If a past category is a perfect fit, reuse it (increases consistency for the freelancer).
- Keep category names short and billingable — avoid overly generic names like "أخرى" unless truly unclear.

Gig title: """${title}"""`;
}
