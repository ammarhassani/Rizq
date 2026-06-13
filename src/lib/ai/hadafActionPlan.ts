/**
 * HADAF action plan generator — spec P5.8 / M5.6.
 * Generates a bilingual (ar + en) action plan for a freelancer who is
 * not yet qualifying for HADAF subsidy. Returns null on any failure.
 *
 * IMPORTANT labeling rules:
 * - Always labeled "هذه خطة مقترحة بناءً على تحليل بياناتك — ليست نصيحة مالية."
 * - NEVER guarantees eligibility.
 * - AI cannot fabricate data not supplied in the context.
 */
import "server-only";
import { generateObject } from "ai";
import { z } from "zod";
import { deepseek, REASONING_MODEL } from "@/lib/ai/client";

export type ActiveProposal = {
  title: string | null;
  price_anchor: number | null;
  client: string | null;
  days_since_sent: number;
};

export type InProgressGig = {
  title: string;
  amount_sar: number;
};

export type ClientNeedingFollowup = {
  name: string;
  days_since_contact: number | null;
};

export type HadafActionPlanCtx = {
  current_income: number;
  target_income: number;
  days_remaining_in_month: number;
  active_proposals: ActiveProposal[];
  in_progress_gigs: InProgressGig[];
  clients_needing_followup: ClientNeedingFollowup[];
  avg_3mo_income: number | null;
};

const ActionPlanSchema = z.object({
  ar: z.string().describe("Arabic action plan text, 3-5 bullet points."),
  en: z.string().describe("English action plan text, 3-5 bullet points."),
});

export type HadafActionPlan = z.infer<typeof ActionPlanSchema>;

/**
 * Builds the HADAF action plan prompt. Pure function — exported for unit tests.
 * NEVER invents data not present in ctx.
 */
export function buildHadafActionPlanPrompt(ctx: HadafActionPlanCtx): string {
  const gapSar = Math.max(0, ctx.target_income - ctx.current_income);
  const proposalsSummary =
    ctx.active_proposals.length > 0
      ? ctx.active_proposals
          .map((p) => {
            const title = p.title ?? "عرض بدون عنوان";
            const client = p.client ?? "عميل";
            const price = p.price_anchor != null ? `${p.price_anchor} ريال` : "سعر غير محدد";
            return `  - "${title}" إلى ${client} (${price}) — منذ ${p.days_since_sent} يومًا`;
          })
          .join("\n")
      : "  لا توجد عروض مُرسَلة حاليًا.";

  const gigsSummary =
    ctx.in_progress_gigs.length > 0
      ? ctx.in_progress_gigs
          .map((g) => `  - "${g.title}": ${g.amount_sar} ريال`)
          .join("\n")
      : "  لا توجد مشاريع قيد التنفيذ.";

  const followupSummary =
    ctx.clients_needing_followup.length > 0
      ? ctx.clients_needing_followup
          .map((c) => {
            const days =
              c.days_since_contact != null
                ? `آخر تواصل منذ ${c.days_since_contact} يومًا`
                : "لم يتم التواصل مسبقًا";
            return `  - ${c.name} (${days})`;
          })
          .join("\n")
      : "  لا يوجد عملاء يحتاجون متابعة عاجلة.";

  const avg3moLine =
    ctx.avg_3mo_income != null
      ? `متوسط دخلك آخر ٣ أشهر: ${ctx.avg_3mo_income.toFixed(0)} ريال.`
      : "لا يوجد متوسط دخل متاح بعد.";

  return `أنت مساعد تحليل رِزق (Rizq) للمستقلين السعوديين. مهمتك كتابة خطة عمل مقترحة وواقعية للمستقل لمساعدته في الوصول إلى الحد الأدنى المطلوب لبرنامج هدف.

المعلومات المتاحة (لا تخترع أي بيانات غير موجودة أدناه):

الوضع المالي:
- الدخل الحالي هذا الشهر: ${ctx.current_income} ريال
- الهدف المطلوب لهذا الشهر: ${ctx.target_income} ريال
- الفجوة المتبقية: ${gapSar} ريال
- الأيام المتبقية في الشهر: ${ctx.days_remaining_in_month} يوم
- ${avg3moLine}

العروض المُرسَلة (في انتظار رد العميل):
${proposalsSummary}

المشاريع قيد التنفيذ:
${gigsSummary}

العملاء الذين يحتاجون متابعة:
${followupSummary}

القواعد الصارمة:
- اكتب 3–5 نقاط عملية ومحددة بالبيانات الموجودة فقط.
- استخدم أسماء العملاء والمبالغ الواردة أعلاه عند ذكرهم.
- لا تخترع عملاء أو أسعار أو مشاريع غير موجودة.
- لا تضمن الأهلية لبرنامج هدف — هذا ليس استشارة مالية أو حكومية.
- أضف في نهاية النص العربي هذه الجملة حرفياً (إلزامي): "هذه خطة مقترحة بناءً على تحليل بياناتك — ليست نصيحة مالية."
- النبرة: سعودية مهذبة، مشجعة لكن صريحة.
- أعد الخطة بالعربية (ar) والإنجليزية (en).
- في الإنجليزية أضف: "This is an AI-suggested plan based on your data — not financial advice."
- تنسيق النقاط: ابدأ كل نقطة بـ "•"

اكتب الخطة الآن:`;
}

/**
 * Generates a bilingual HADAF action plan.
 * Returns null on any error (network, timeout, parse).
 */
export async function generateHadafActionPlan(
  ctx: HadafActionPlanCtx
): Promise<HadafActionPlan | null> {
  const prompt = buildHadafActionPlanPrompt(ctx);
  try {
    const result = await generateObject({
      model: deepseek(REASONING_MODEL),
      schema: ActionPlanSchema,
      prompt,
      abortSignal: AbortSignal.timeout(15_000),
    });
    return result.object;
  } catch (err) {
    console.error("[generateHadafActionPlan] failed", err);
    return null;
  }
}
