/**
 * Client Persona AI module — spec M2.6-C.
 * Generates a short Arabic persona description for a client with >= 3 gigs.
 * Server-only.
 */
import "server-only";
import { generateText } from "ai";
import { deepseek, REASONING_MODEL } from "@/lib/ai/client";

export type ClientPersonaCtx = {
  name: string;
  client_type: string | null;
  industry: string | null;
  tags: string[];
  avgPaymentDays: number | null;
  totalValueSar: number;
  gigCount: number;
  gigs: Array<{ title: string; amount_sar: number; status: string }>;
};

/**
 * Returns true when enough gig history exists to generate a meaningful persona.
 * Spec M2.6-C: minimum 3 gigs required.
 */
export function canGeneratePersona(gigCount: number): boolean {
  return gigCount >= 3;
}

/**
 * Generates a 1–2 sentence Arabic persona description.
 * Returns string | null on failure.
 */
export async function generatePersona(ctx: ClientPersonaCtx): Promise<string | null> {
  if (!canGeneratePersona(ctx.gigCount)) return null;
  const prompt = buildPersonaPrompt(ctx);
  try {
    const result = await generateText({
      model: deepseek(REASONING_MODEL),
      prompt,
      abortSignal: AbortSignal.timeout(10_000),
    });
    const text = result.text.trim();
    if (!text) return null;
    return text;
  } catch (err) {
    console.error("[generatePersona] failed", err);
    return null;
  }
}

function buildPersonaPrompt(ctx: ClientPersonaCtx): string {
  const gigsList = ctx.gigs
    .slice(0, 10)
    .map((g) => `- ${g.title}: ${g.amount_sar} SAR (${g.status})`)
    .join("\n");

  const paymentSpeed =
    ctx.avgPaymentDays != null
      ? ctx.avgPaymentDays <= 7
        ? "سريع جدًا في الدفع"
        : ctx.avgPaymentDays <= 21
          ? "معتدل في الدفع"
          : "بطيء في الدفع"
      : "لا معلومات عن سرعة الدفع";

  return `أنت محلل مساعد لمستقل سعودي. بناءً على البيانات التالية، اكتب وصفًا موجزًا (جملة أو جملتان) لشخصية هذا العميل بالعربية.

بيانات العميل (مجهّلة):
- النوع: ${ctx.client_type ?? "غير محدد"}
- القطاع: ${ctx.industry ?? "غير محدد"}
- التصنيفات: ${ctx.tags.join("، ") || "لا يوجد"}
- إجمالي القيمة: ${ctx.totalValueSar} ريال من ${ctx.gigCount} مشروع
- ${paymentSpeed}

المشاريع:
${gigsList}

القواعد:
- الوصف بالعربية فقط.
- مثال على الأسلوب: "عميل مؤسسي، يدفع بسرعة، يطلب مشاريع تصميم دورية."
- جملة أو جملتان فقط — موجز ومفيد.
- لا تخترع معلومات غير موجودة أعلاه.
- لا تذكر اسم العميل.

اكتب الوصف الآن:`;
}
