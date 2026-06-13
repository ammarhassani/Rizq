/**
 * Payment reminder AI module — spec M6.4-B.
 * Drafts a Saudi-polite but firm Arabic WhatsApp-ready payment reminder.
 * Only applicable when an invoice is ≥7 days overdue.
 * Server-only.
 *
 * FREE for all authenticated users — no Pro gate.
 * Tone is hardcoded to "balanced" — no per-user preferred_tone query.
 */
import "server-only";
import { generateText } from "ai";
import { deepseek, REASONING_MODEL } from "@/lib/ai/client";

// ---------------------------------------------------------------------------
// Context types
// ---------------------------------------------------------------------------

export type PaymentReminderCtx = {
  invoiceNumber: string;
  totalSar: number;
  dueDate: string | null;
  daysOverdue: number;
  clientName: string | null;
  clientCompany: string | null;
  paymentDetails: string | null;
  tone: "formal" | "balanced" | "friendly";
};

// ---------------------------------------------------------------------------
// Pure prompt builder (exported for testing)
// ---------------------------------------------------------------------------

/**
 * Builds the prompt for the AI payment reminder generator.
 * Pure function — no side effects, no network calls.
 */
export function buildPaymentReminderPrompt(ctx: PaymentReminderCtx): string {
  const recipientDesc = ctx.clientName
    ? ctx.clientCompany
      ? `${ctx.clientName} (${ctx.clientCompany})`
      : ctx.clientName
    : "العميل الكريم";

  const amountFormatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(ctx.totalSar);

  const dueDateLine = ctx.dueDate
    ? `تاريخ الاستحقاق: ${ctx.dueDate}`
    : "تاريخ الاستحقاق: غير محدد";

  const paymentDetailsLine = ctx.paymentDetails
    ? `معلومات الدفع: ${ctx.paymentDetails}`
    : "معلومات الدفع: يرجى التواصل معي لتأكيد طريقة الدفع.";

  const toneInstructions: Record<PaymentReminderCtx["tone"], string> = {
    formal: "النبرة: رسمية ومحترمة جدًا، مناسبة للتواصل المؤسسي.",
    balanced: "النبرة: متوازنة — محترمة لكن ودية، مناسبة لمعظم العملاء السعوديين. حازمة دون أن تكون مزعجة.",
    friendly: "النبرة: ودية ومباشرة، مناسبة لعميل تعرفه جيدًا.",
  };

  return `أنت مستقل سعودي محترف. اكتب رسالة تذكير بالدفع جاهزة للإرسال عبر واتساب.

تفاصيل الفاتورة:
- رقم الفاتورة: ${ctx.invoiceNumber}
- إجمالي المبلغ المستحق: ${amountFormatted} ر.س
- ${dueDateLine}
- عدد أيام التأخير: ${ctx.daysOverdue} يوم
- ${paymentDetailsLine}
- الموجهة إلى: ${recipientDesc}

${toneInstructions[ctx.tone]}

القواعد الصارمة:
- الرسالة جاهزة للنسخ واللصق مباشرة في واتساب — لا عناوين ولا أكواد.
- اذكر رقم الفاتورة والمبلغ وتاريخ الاستحقاق بوضوح.
- اذكر أيام التأخير بلطف دون إحراج مبالغ فيه.
- إذا كانت معلومات الدفع متوفرة، أدرجها في الرسالة.
- اعرض مناقشة أي استفسارات.
- 2–3 جمل فقط، لا أكثر.
- لا تخترع معلومات غير موجودة أعلاه / do not invent information not provided in the context above.
- استخدم تحية سعودية مناسبة.

اكتب رسالة التذكير الآن:`;
}

// ---------------------------------------------------------------------------
// AI call
// ---------------------------------------------------------------------------

/**
 * Drafts a Saudi-polite payment reminder message ready to paste into WhatsApp.
 * Returns the draft string or null on failure.
 *
 * Tone is hardcoded to "balanced" — do NOT query users.preferred_tone.
 */
export async function draftPaymentReminder(
  ctx: PaymentReminderCtx
): Promise<string | null> {
  const prompt = buildPaymentReminderPrompt(ctx);
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
    console.error("[draftPaymentReminder] failed", err);
    return null;
  }
}
