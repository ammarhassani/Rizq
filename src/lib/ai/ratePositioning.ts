/**
 * Rate positioning narrative — spec M10.5.
 * Generates a bilingual (ar + en) 2–3 sentence positioning narrative for a
 * freelancer who wants to target a specific per-project rate.
 *
 * IMPORTANT labeling rules (MUST appear in callers):
 * - Always labeled "تحليل رِزق —" in Arabic UI.
 * - NEVER discourages the freelancer.
 * - NEVER over-promises outcomes.
 * - Returns null on any failure (network, timeout, parse).
 */
import "server-only";
import { generateObject } from "ai";
import { z } from "zod";
import { deepseek, REASONING_MODEL } from "@/lib/ai/client";

export type RatePositioningCtx = {
  target_rate: number;            // per-project rate the user wants to hit (SAR)
  specialty_name_ar: string;
  specialty_name_en: string;
  city_name_ar: string;
  city_name_en: string;
  tier_name_ar: string;
  tier_name_en: string;
  market_p10: number;             // band min
  market_p50: number;             // band anchor
  market_p90: number;             // band max
  sample_size: number;
  avg_3mo_income: number | null;  // SAR, or null if no history
  gig_count: number;              // total number of logged gigs
};

const RatePositioningSchema = z.object({
  ar: z.string().describe(
    "Arabic positioning narrative: 2–3 sentences. Saudi-polite, honest, grounding the freelancer in real data. NEVER discourages. NEVER over-promises."
  ),
  en: z.string().describe(
    "English positioning narrative: 2–3 sentences. Professional, honest, data-grounded. NEVER discourages. NEVER over-promises."
  ),
});

export type RatePositioning = z.infer<typeof RatePositioningSchema>;

/**
 * Builds the positioning prompt. Pure function — exported for unit tests.
 * Injected context only; never invents data not in ctx.
 */
export function buildRatePositioningPrompt(ctx: RatePositioningCtx): string {
  const {
    target_rate,
    specialty_name_ar,
    specialty_name_en,
    city_name_ar,
    city_name_en,
    tier_name_ar,
    tier_name_en,
    market_p10,
    market_p50,
    market_p90,
    sample_size,
    avg_3mo_income,
    gig_count,
  } = ctx;

  const incomeContext =
    avg_3mo_income != null
      ? `متوسط دخل المستقل آخر ٣ أشهر: ${avg_3mo_income.toFixed(0)} ريال شهريًا (بناءً على ${gig_count} مشروع مسجّل).`
      : gig_count > 0
      ? `لديه ${gig_count} مشروع مسجّل لكن لا يكفي لحساب متوسط ٣ أشهر بعد.`
      : "لا توجد مشاريع مسجّلة بعد.";

  const incomeContextEn =
    avg_3mo_income != null
      ? `Freelancer's 3-month average income: SAR ${avg_3mo_income.toFixed(0)}/month (based on ${gig_count} logged projects).`
      : gig_count > 0
      ? `${gig_count} projects logged but not enough for a 3-month average yet.`
      : "No projects logged yet.";

  return `أنت محلل رِزق (Rizq) المتخصص في سوق العمل الحر السعودي. مهمتك كتابة فقرة تحليلية موجزة (جملتان إلى ثلاث جمل) لمستقل سعودي يريد أن يفهم موقعه السعري في السوق.

بيانات المستقل والسوق (لا تخترع أي أرقام غير موجودة هنا):

التخصص: ${specialty_name_ar} (${specialty_name_en})
المدينة: ${city_name_ar} (${city_name_en})
مستوى الخبرة: ${tier_name_ar} (${tier_name_en})
السعر المستهدف للمشروع: ${target_rate.toLocaleString("ar-SA")} ريال

نطاق السوق (بناءً على ${sample_size} سجل حقيقي):
- الحد الأدنى (P10): ${market_p10.toLocaleString("ar-SA")} ريال
- الوسيط (P50): ${market_p50.toLocaleString("ar-SA")} ريال
- الحد الأعلى (P90): ${market_p90.toLocaleString("ar-SA")} ريال

سجل الأرباح:
- ${incomeContext}
- ${incomeContextEn}

القواعد الصارمة:
- اكتب فقرة واحدة بالعربية (ar) وفقرة واحدة بالإنجليزية (en).
- الجملتان أو الثلاث جمل تحلل: أين يقع السعر المستهدف في النطاق، تقييم صادق وموجز، وتشجيع مبني على البيانات فقط.
- لا تُثبِّط المستقل أبدًا — الأداة للتمكين لا للإحباط.
- لا تعِد بنتائج غير مضمونة (لا تقل "ستنجح بالتأكيد" أو ما شابه).
- لا تخترع بيانات غير موجودة في المعلومات أعلاه.
- النبرة: سعودية مهذبة ومشجعة، صريحة في البيانات.
- في نهاية النص العربي: لا تُضف تحذيرًا — الواجهة ستضيفه بجانب "تحليل رِزق —".
- في النص الإنجليزي: انتهِ بتحذير موجز: "This is a Rizq AI analysis — not financial advice."

اكتب التحليل الآن:`;
}

/**
 * Generates a bilingual rate positioning narrative.
 * Returns null on any error (network, timeout, parse, missing key).
 */
export async function generateRatePositioning(
  ctx: RatePositioningCtx
): Promise<RatePositioning | null> {
  const prompt = buildRatePositioningPrompt(ctx);
  try {
    const result = await generateObject({
      model: deepseek(REASONING_MODEL),
      schema: RatePositioningSchema,
      prompt,
      abortSignal: AbortSignal.timeout(15_000),
    });
    return result.object;
  } catch (err) {
    console.error("[generateRatePositioning] failed", err);
    return null;
  }
}
