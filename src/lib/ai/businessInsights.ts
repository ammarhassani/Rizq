/**
 * Business-insights contract for the dashboard "Rizq Insights" card.
 *
 * This module is CLIENT-SAFE: the schema, types, prompt builder, deterministic
 * fallback, and `stripEmDashes` sanitizer carry no server-only dependency, so
 * the InsightsWidget can import `BusinessInsightsSchema` + `stripEmDashes` for
 * its `useObject` streaming pass. The DeepSeek call lives in the server action
 * (actions/dashboard/insights.ts) and the streaming route, never here, so this
 * module carries no server-only dependency.
 */
import { z } from "zod";

export type BusinessInsightsCtx = {
  proposals: Array<{ title: string | null; clientName: string | null; status: string; amount: number | null; date: string | null }>;
  gigs: Array<{ title: string; status: string; amount_sar: number; date: string | null }>;
  clients: Array<{ name: string; total_gigs: number; total_value_sar: number; last_contacted_at: string | null }>;
  income: Array<{ month: string; total_sar: number; paid_sar: number; pending_sar: number }>;
  deadlines: Array<{ type: string; title: string; date: string; status: string }>;
};

const InsightKind = z.enum(["income", "client", "proposal", "deadline", "general"]);

export const BusinessInsightsSchema = z.object({
  insights: z.array(
    z.object({
      ar: z.string(),
      en: z.string(),
      kind: InsightKind,
    })
  ).min(0).max(4),
});

export type BusinessInsightsResult = z.infer<typeof BusinessInsightsSchema>;
export type InsightItem = BusinessInsightsResult["insights"][number];

/** Plain integer formatting (Western digits) for embedding in insight strings. */
function fmtNum(n: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Math.round(n));
}

/**
 * Replace em/en dashes (a model-output tic the founder dislikes) with a comma.
 * Only touches — and – ; regular hyphens in ranges like "1000-1500" are kept.
 */
export function stripEmDashes(s: string, locale: "ar" | "en"): string {
  const sep = locale === "ar" ? "، " : ", ";
  return s.replace(/\s*[—–]\s*/g, sep).replace(/\s{2,}/g, " ").trim();
}

/**
 * Deterministic, non-AI insights computed directly from the freelancer's data.
 * Used as a graceful fallback when the AI provider is unavailable, so the
 * dashboard card always shows something useful and truthful. These are plain
 * facts from the user's own data — labeled as a summary, never as AI analysis.
 * Pure + side-effect free (testable).
 */
export function buildDeterministicInsights(ctx: BusinessInsightsCtx): InsightItem[] {
  const out: InsightItem[] = [];

  // Latest month income.
  if (ctx.income.length > 0) {
    const m = ctx.income[0];
    out.push({
      kind: "income",
      ar: `دخل شهر ${m.month}: ${fmtNum(m.total_sar)} ريال (مدفوع ${fmtNum(m.paid_sar)}، قيد التحصيل ${fmtNum(m.pending_sar)}).`,
      en: `${m.month} income: ${fmtNum(m.total_sar)} SAR (paid ${fmtNum(m.paid_sar)}, outstanding ${fmtNum(m.pending_sar)}).`,
    });
  }

  // Upcoming / overdue invoice deadlines.
  if (ctx.deadlines.length > 0) {
    const overdue = ctx.deadlines.filter((d) => d.status === "overdue").length;
    const n = ctx.deadlines.length;
    out.push({
      kind: "deadline",
      ar:
        overdue > 0
          ? `لديك ${fmtNum(overdue)} فاتورة متأخرة و${fmtNum(n)} فاتورة مستحقة قريبًا. تابع التحصيل.`
          : `لديك ${fmtNum(n)} فاتورة مستحقة خلال الفترة القادمة.`,
      en:
        overdue > 0
          ? `You have ${fmtNum(overdue)} overdue invoice(s) and ${fmtNum(n)} due soon. Follow up on collection.`
          : `You have ${fmtNum(n)} invoice(s) due in the coming period.`,
    });
  }

  // Top client by lifetime value.
  const topClient = [...ctx.clients].sort((a, b) => b.total_value_sar - a.total_value_sar)[0];
  if (topClient && topClient.total_value_sar > 0) {
    out.push({
      kind: "client",
      ar: `أعلى عميل من حيث القيمة: ${topClient.name} (${fmtNum(topClient.total_value_sar)} ريال عبر ${fmtNum(topClient.total_gigs)} مشروع).`,
      en: `Top client by value: ${topClient.name} (${fmtNum(topClient.total_value_sar)} SAR across ${fmtNum(topClient.total_gigs)} project(s)).`,
    });
  }

  // Recent proposal pipeline.
  if (ctx.proposals.length > 0) {
    const sum = ctx.proposals.reduce((s, p) => s + (p.amount ?? 0), 0);
    out.push({
      kind: "proposal",
      ar:
        sum > 0
          ? `لديك ${fmtNum(ctx.proposals.length)} عرض في آخر 30 يومًا بإجمالي ${fmtNum(sum)} ريال.`
          : `لديك ${fmtNum(ctx.proposals.length)} عرض في آخر 30 يومًا.`,
      en:
        sum > 0
          ? `${fmtNum(ctx.proposals.length)} proposal(s) in the last 30 days totaling ${fmtNum(sum)} SAR.`
          : `${fmtNum(ctx.proposals.length)} proposal(s) in the last 30 days.`,
    });
  }

  return out.slice(0, 4);
}

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
- كل رؤية جملة أو جملتان.
- لا تستخدم الشرطة الطويلة (—) أبدًا؛ استخدم فاصلة أو جملة جديدة.
- النبرة: سعودية مهذبة، مباشرة.
- أعد النتيجة بالعربية (ar) والإنجليزية (en) مع تصنيف kind: income|client|proposal|deadline|general.`;
}

// generateBusinessInsights (the DeepSeek call) lives in the server action
// (actions/dashboard/insights.ts) so this module stays free of server-only deps
// and can be imported by the client InsightsWidget for its streaming schema.
