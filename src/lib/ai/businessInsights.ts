import "server-only";
import { generateObject } from "ai";
import { z } from "zod";
import { deepseek, REASONING_MODEL } from "@/lib/ai/client";

export type BusinessInsightsCtx = {
  proposals: Array<{ title: string | null; clientName: string | null; status: string; amount: number | null; date: string | null }>;
  gigs: Array<{ title: string; status: string; amount_sar: number; date: string | null }>;
  clients: Array<{ name: string; total_gigs: number; total_value_sar: number; last_contacted_at: string | null }>;
  income: Array<{ month: string; total_sar: number; paid_sar: number; pending_sar: number }>;
  deadlines: Array<{ type: string; title: string; date: string; status: string }>;
};

const InsightKind = z.enum(["income", "client", "proposal", "deadline", "general"]);

const BusinessInsightsSchema = z.object({
  insights: z.array(
    z.object({
      ar: z.string(),
      en: z.string(),
      kind: InsightKind,
    })
  ).min(0).max(4),
});

export type BusinessInsightsResult = z.infer<typeof BusinessInsightsSchema>;

/**
 * Builds the prompt for business insights. Pure function — testable without AI mocking.
 * Exported so the unit test can assert on prompt content without needing to run AI.
 */
export function buildBusinessInsightsPrompt(ctx: BusinessInsightsCtx): string {
  const proposalsSummary = ctx.proposals.length
    ? ctx.proposals.slice(0, 10).map(
        (p) => `- "${p.title ?? "عرض"}" → ${p.clientName ?? "?"} | ${p.amount != null ? `${p.amount} SAR` : "غير محدد"} | ${p.status} | ${p.date ?? "غير محدد"}`
      ).join("\n")
    : "لا توجد عروض.";

  const gigsSummary = ctx.gigs.length
    ? ctx.gigs.slice(0, 10).map(
        (g) => `- "${g.title}": ${g.amount_sar} SAR (${g.status})${g.date ? ` — ${g.date}` : ""}`
      ).join("\n")
    : "لا توجد مشاريع.";

  const clientsSummary = ctx.clients.length
    ? ctx.clients.slice(0, 10).map(
        (c) => `- ${c.name}: ${c.total_gigs} مشروع، ${c.total_value_sar} SAR إجمالي${c.last_contacted_at ? ` (آخر تواصل: ${c.last_contacted_at})` : ""}`
      ).join("\n")
    : "لا يوجد عملاء.";

  const incomeSummary = ctx.income.length
    ? ctx.income.slice(0, 6).map(
        (m) => `- ${m.month}: إجمالي ${m.total_sar} SAR | مدفوع ${m.paid_sar} SAR | قيد الدفع ${m.pending_sar} SAR`
      ).join("\n")
    : "لا توجد بيانات دخل.";

  const deadlinesSummary = ctx.deadlines.length
    ? ctx.deadlines.slice(0, 10).map(
        (d) => `- [${d.type}] "${d.title}" | ${d.date} | ${d.status}`
      ).join("\n")
    : "لا توجد مواعيد قادمة.";

  return `أنت مساعد تحليل رِزق (Rizq Insight) للمستقلين السعوديين. مهمتك تحليل بيانات المستقل وتقديم 2–4 رؤى عملية وصريحة.

البيانات المتاحة فقط (لا تخترع أي رقم أو معلومة غير موجودة أدناه):

عروض آخر 30 يوم:
${proposalsSummary}

مشاريع آخر 3 أشهر:
${gigsSummary}

العملاء:
${clientsSummary}

الدخل الشهري (آخر 6 أشهر):
${incomeSummary}

المواعيد القادمة (30 يوم):
${deadlinesSummary}

القواعد الصارمة:
- لا تخترع أي بيانات غير موجودة أعلاه.
- كن محدداً بالأرقام الموجودة فقط (مثال: "لديك 3 عروض بقيمة إجمالية X ريال").
- نبّه على المخاطر (فواتير متأخرة، عملاء لم يتم التواصل معهم >60 يومًا، مواعيد قادمة).
- أبرز الفرص (عملاء بإمكانية تكرار، شهر دخل جيد).
- لا تقدم استشارة مالية أو قانونية.
- ضع في كل رؤية: "هذا تحليل آلي — ليس استشارة مهنية" (هذا الشرط إلزامي في كل عنصر ar).
- كل رؤية جملة أو جملتان.
- النبرة: سعودية مهذبة، مباشرة.
- أعد النتيجة بالعربية (ar) والإنجليزية (en) مع تصنيف kind: income|client|proposal|deadline|general.`;
}

/**
 * Generates 2–4 business insights for a Saudi freelancer dashboard.
 * Returns null on any error (network, timeout, parse).
 */
export async function generateBusinessInsights(
  ctx: BusinessInsightsCtx
): Promise<BusinessInsightsResult | null> {
  const prompt = buildBusinessInsightsPrompt(ctx);
  try {
    const result = await generateObject({
      model: deepseek(REASONING_MODEL),
      schema: BusinessInsightsSchema,
      prompt,
      abortSignal: AbortSignal.timeout(20_000),
    });
    return result.object;
  } catch (err) {
    console.error("[generateBusinessInsights] failed", err);
    return null;
  }
}
