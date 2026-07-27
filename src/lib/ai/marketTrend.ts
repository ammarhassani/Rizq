/**
 * Market-trend interpretation — spec M4 "AI-trend layer", the AI half.
 *
 * The DIRECTION and PERCENT are computed from real dated rows
 * (src/lib/pricing/trend.ts) — this layer only INTERPRETS that signal into a
 * short, honest, Saudi-appropriate sentence with light guidance. It never
 * invents a direction, a figure, or a forecast beyond the computed move.
 *
 * Labeling (Principle I): the UI prefixes the output with "تحليل رِزق —" /
 * "Rizq Insight —". Returns null on any failure so the caller degrades to the
 * plain computed trend line.
 */
import "server-only";
import { generateObject } from "ai";
import { z } from "zod";
import { deepseek, REASONING_MODEL } from "@/lib/ai/client";
import type { MarketTrend } from "@/lib/pricing/trend";

export type MarketTrendNarrativeCtx = {
  trend: MarketTrend;
  /**
   * Specialty/city as displayed to the user. Single (already-localized) label —
   * the caller only ever has the active locale's name, so we don't pretend to
   * carry both and risk feeding the wrong script into the other language.
   */
  specialty_name: string;
  city_name: string;
};

const NarrativeSchema = z.object({
  ar: z.string().describe(
    "Arabic: ONE short sentence interpreting the computed market move. Saudi-polite, honest, grounded only in the numbers given. No forecast, no over-promise.",
  ),
  en: z.string().describe(
    "English: ONE short sentence interpreting the computed market move. Professional, honest, grounded only in the numbers given. No forecast, no over-promise.",
  ),
});

export type MarketTrendNarrative = z.infer<typeof NarrativeSchema>;

const DIRECTION_AR: Record<MarketTrend["direction"], string> = {
  rising: "صاعد",
  falling: "هابط",
  stable: "مستقر",
};

/** Pure prompt builder — exported for tests. Injects only the computed signal. */
export function buildMarketTrendPrompt(ctx: MarketTrendNarrativeCtx): string {
  const { trend, specialty_name, city_name } = ctx;
  const absPct = Math.abs(trend.percent);
  // The signal may be computed on a wider row set than the freelancer's own city.
  // Tell the model which market it is describing, and forbid the narrower claim —
  // otherwise it writes "in Jeddah" about a nationwide move.
  const SCOPE_AR: Record<MarketTrend["scope"], string> = {
    exact: `سوق ${specialty_name} في ${city_name}`,
    region: `سوق ${specialty_name} في منطقة ${city_name}`,
    national: `سوق ${specialty_name} على مستوى السعودية (وليس ${city_name} وحدها)`,
  };
  return `أنت محلل رِزق (Rizq) لسوق العمل الحر السعودي. لديك إشارة اتجاه سعري محسوبة من بيانات حقيقية مؤرّخة. مهمتك: صياغة جملة واحدة قصيرة تفسّر هذه الإشارة بصدق.

المعطيات (لا تخترع أي رقم غير موجود هنا):
- التخصص: ${specialty_name}
- المدينة: ${city_name}
- نطاق الإشارة: ${SCOPE_AR[trend.scope]}
- الاتجاه: ${DIRECTION_AR[trend.direction]} (${trend.direction})
- نسبة التغيّر: ${trend.clamped ? "أكثر من " : ""}${trend.percent > 0 ? "+" : ""}${Math.abs(trend.percent)}% (وسيط النصف الأحدث مقابل النصف الأقدم)
- الوسيط الأقدم: ${trend.older_median} ريال — الوسيط الأحدث: ${trend.recent_median} ريال
- المدى الزمني: ${trend.span_months} شهر تقريبًا، بناءً على ${trend.sample_size} سجل

القواعد الصارمة:
- جملة واحدة بالعربية (ar) وجملة واحدة بالإنجليزية (en). قصيرتان.
- فسّر ماذا يعني ${absPct}% ${trend.direction} للمستقل (مثلاً: فرصة لمراجعة السعر) دون وعود.
- لا تتنبّأ بالمستقبل. لا تقل "سيرتفع" أو "سينخفض". صف ما حدث فقط.
- لا تخترع أرقامًا أو أسبابًا غير موجودة في المعطيات.
- التزم بنطاق الإشارة أعلاه. إذا كان النطاق على مستوى السعودية فلا تنسب الحركة إلى ${city_name} وحدها.
- لا تضف بادئة "تحليل رِزق" — الواجهة تضيفها.

اكتب الآن:`;
}

/** Generate the bilingual interpretation. Returns null on any error (graceful). */
export async function generateMarketTrendNarrative(
  ctx: MarketTrendNarrativeCtx,
): Promise<MarketTrendNarrative | null> {
  try {
    const result = await generateObject({
      model: deepseek(REASONING_MODEL),
      schema: NarrativeSchema,
      prompt: buildMarketTrendPrompt(ctx),
      abortSignal: AbortSignal.timeout(12_000),
    });
    return result.object;
  } catch (err) {
    console.error("[generateMarketTrendNarrative] failed", err);
    return null;
  }
}
