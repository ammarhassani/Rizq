/**
 * AI brand-kit suggestion for Onboarding (Brand step). From what the freelancer
 * already entered (specialty, city, years, name), generates a full identity —
 * brand name + tagline + short bio — as single strings in their app language.
 * Server-only. Labeled in the UI as an AI suggestion the user reviews + edits.
 */
import "server-only";
import { generateObject } from "ai";
import { z } from "zod";
import { deepseek, REASONING_MODEL } from "@/lib/ai/client";

export type BrandKitCtx = {
  specialty: string | null;
  city: string | null;
  years: number | null;
  fullName: string | null;
  locale: "ar" | "en";
};

const BrandKitSchema = z.object({
  brand_name: z.string().min(1).max(120),
  tagline: z.string().min(1).max(200),
  bio: z.string().min(1).max(500),
});

export type BrandKit = z.infer<typeof BrandKitSchema>;

/** Pure — builds the prompt from context. Exported for unit testing. */
export function buildBrandKitPrompt(ctx: BrandKitCtx): string {
  const specialty = ctx.specialty ?? "مستقل";
  const city = ctx.city ?? "السعودية";
  const years = ctx.years != null ? `${ctx.years}` : "غير محدد";
  const name = ctx.fullName ?? "غير محدد";
  const lang = ctx.locale === "en" ? "English" : "العربية";

  return `أنت كاتب علامات تجارية راقٍ للسوق السعودي. اكتب هوية موجزة لمستقل سعودي — اسم علامة، وشعار (tagline)، ونبذة قصيرة — كلها بـ${lang}.

ما سجّله المستقل حتى الآن:
- الاسم: ${name}
- التخصص: ${specialty}
- المقر: ${city}
- سنوات الخبرة: ${years}

المطلوب لكل حقل:
- brand_name: اسم علامة قصير واحترافي (كلمة إلى ثلاث كلمات) يليق بالتخصص. يجوز أن يستلهم اسم المستقل أو كلمة موحية. تجنّب الحشو مثل "خدمات/حلول/services/solutions".
- tagline: عبارة قصيرة أنيقة (كلمتان إلى ست كلمات) تُحفظ، لا جملة.
- bio: جملة إلى جملتين طبيعيتين بضمير المتكلم، تصف حرفته وخبرته بصدق.

ممنوع منعًا باتًا:
- أي وعد بالدخل أو الأرباح أو المضاعفة أو النمو أو أرقام/نسب تسويقية ("ارفع دخلك"، "boost your income"، "double your gains").
- المبالغة والادعاءات ("الأفضل"، "الأول"، "رائد"، "مضمون").
- حشر اسم المدينة أو كلمة "سعودي"/"الرياض" في نص الشعار.
- لا تخترع مؤهلات أو إنجازات غير موجودة في السياق (ذكر سنوات الخبرة الفعلية مسموح).

النبرة: واثقة وراقية بلمسة إنسانية، لا تسويقية صاخبة. أرجع الحقول الثلاثة فقط.`;
}

/**
 * Calls DeepSeek to generate a brand kit. Returns null on any error. 12s timeout.
 */
export async function suggestBrandKit(ctx: BrandKitCtx): Promise<BrandKit | null> {
  const prompt = buildBrandKitPrompt(ctx);
  try {
    const result = await generateObject({
      model: deepseek(REASONING_MODEL),
      schema: BrandKitSchema,
      prompt,
      abortSignal: AbortSignal.timeout(12_000),
    });
    return result.object;
  } catch (err) {
    console.error("[suggestBrandKit] failed", err);
    return null;
  }
}
