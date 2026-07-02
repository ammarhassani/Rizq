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
  city: string | null;
  /** The freelancer's app language — suggestions are written in it. */
  locale: "ar" | "en";
};

// One field per tagline now (no per-language duplication) → single strings.
const TaglineSuggestionsSchema = z.object({
  taglines: z.array(z.string().min(1).max(200)).length(3),
});

export type TaglineSuggestions = z.infer<typeof TaglineSuggestionsSchema>;

/**
 * Pure function — builds the prompt from context. Exported for unit testing.
 */
export function buildTaglinePrompt(ctx: TaglineCtx): string {
  const specialty = ctx.specialty ?? "مستقل";
  const city = ctx.city ?? "السعودية";
  const bio = ctx.bio_ar
    ? `نبذة المستقل: ${ctx.bio_ar.slice(0, 400)}`
    : "لا توجد نبذة متاحة.";
  const lang = ctx.locale === "en" ? "English" : "العربية";

  return `أنت كاتب علامات تجارية راقٍ للسوق السعودي. اكتب 3 شعارات (taglines) قصيرة وأنيقة لعلامة مستقل سعودي — كلها مكتوبة بـ${lang}.

السياق (للإلهام فقط، لا لإدراجه حرفيًا):
- التخصص: ${specialty}
- المقر: ${city}
- ${bio}

الشعار الجيد:
- قصير ولافت: من كلمتين إلى ست كلمات — عبارة تُحفظ، لا جملة.
- يعبّر عن حرفة المستقل وقيمته وإحساس التعامل معه.
- لغة سليمة وسلسة وطبيعية، وليست ترجمة حرفية.
- نبرة واثقة وراقية بلمسة إنسانية، لا تسويقية صاخبة.

ممنوع منعًا باتًا (يُرفض الشعار إذا خالف):
- أي وعد بالدخل أو الأرباح أو المضاعفة أو النمو أو أي أرقام/نسب ("ارفع دخلك"، "ضاعف أرباحك"، "boost your income"، "double your gains").
- المبالغة والادعاءات ("الأفضل"، "الأول"، "رائد"، "مضمون").
- حشر اسم المدينة أو كلمة "سعودي"/"الرياض" في نص الشعار.
- لا تخترع أي شيء غير موجود في السياق.

أمثلة جيدة: "هوية تُروى" · "تصميم يبقى في الذاكرة" · "Design that lingers".
أمثلة سيئة — تجنّبها تمامًا: "ارفع دخلك مع موقعك" · "Saudi web dev doubling your gains".

هذه اقتراحات فقط؛ يراجعها المستخدم ويعدّلها. أرجع بالضبط 3 شعارات نصية مفردة في مصفوفة taglines.`;
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
