/**
 * P5.10 — AI tagline suggestion for Onboarding Step 8 (Brand Identity).
 * Generates 3 short bilingual tagline options for the freelancer's brand.
 * Server-only (imports generateObject from ai SDK).
 * Labeled as "اقتراحات رِزق" in the UI — never presented as guaranteed quality.
 */
import "server-only";
import { generateObject } from "ai";
import { z } from "zod";
import { deepseek, REASONING_MODEL } from "@/lib/ai/client";

export type TaglineCtx = {
  specialty: string | null;
  bio_ar: string | null;
  primary_goal: string | null;
  city: string | null;
};

const TaglineSuggestionsSchema = z.object({
  taglines: z
    .array(
      z.object({
        ar: z.string().min(1).max(200),
        en: z.string().min(1).max(200),
      })
    )
    .length(3),
});

export type TaglineSuggestions = z.infer<typeof TaglineSuggestionsSchema>;

/**
 * Pure function — builds the prompt from context. Exported for unit testing.
 */
export function buildTaglinePrompt(ctx: TaglineCtx): string {
  const specialty = ctx.specialty ?? "مستقل";
  const city = ctx.city ?? "السعودية";
  const goal = ctx.primary_goal ?? "increase_income";
  const bio = ctx.bio_ar
    ? `نبذة المستقل: ${ctx.bio_ar.slice(0, 400)}`
    : "لا توجد نبذة متاحة.";

  return `أنت مساعد تسويقي متخصص بالسوق السعودي للمستقلين. مهمتك اقتراح 3 شعارات تجارية قصيرة وجذابة لمستقل سعودي.

السياق:
- التخصص: ${specialty}
- المدينة: ${city}
- الهدف الرئيسي: ${goal}
- ${bio}

القواعد:
- كل شعار يجب أن يكون قصيرًا (بين 4 و12 كلمة عربية، و4 و12 كلمة إنجليزية).
- الشعار يجب أن يعكس هوية المستقل وليس مجرد وصف عام.
- أسلوب سعودي أصيل — لا ترجمة حرفية.
- لا تخترع ادعاءات غير موجودة في السياق.
- النبرة: احترافية مع لمسة شخصية.
- هذه اقتراحات فقط — المستخدم يختار ما يناسبه.
- أرجع بالضبط 3 شعارات بصيغة: { ar: "...", en: "..." }

مثال على الجودة المطلوبة:
{ ar: "تصميم يحكي قصتك بالسوق السعودي", en: "Design that tells your story in the Saudi market" }`;
}

/**
 * Calls DeepSeek to generate 3 bilingual tagline options.
 * Returns null on any error (network, timeout, parse).
 * Timeout: 12 seconds.
 */
export async function suggestTaglines(
  ctx: TaglineCtx
): Promise<TaglineSuggestions | null> {
  const prompt = buildTaglinePrompt(ctx);
  try {
    const result = await generateObject({
      model: deepseek(REASONING_MODEL),
      schema: TaglineSuggestionsSchema,
      prompt,
      abortSignal: AbortSignal.timeout(12_000),
    });
    return result.object;
  } catch (err) {
    console.error("[suggestTaglines] failed", err);
    return null;
  }
}
