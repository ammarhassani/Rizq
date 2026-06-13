/**
 * Invoice description AI module — spec M6.4-A.
 * Generates a professional bilingual (Arabic + English) line-item description
 * from gig/invoice context. Server-only.
 *
 * FREE for all authenticated users — no Pro gate.
 */
import "server-only";
import { generateObject } from "ai";
import { z } from "zod";
import { deepseek, REASONING_MODEL } from "@/lib/ai/client";

// ---------------------------------------------------------------------------
// Context types
// ---------------------------------------------------------------------------

export type InvoiceDescriptionCtx = {
  gigTitle: string;
  gigDescription: string | null;
  amountSar: number;
  clientName: string | null;
  clientCompany: string | null;
};

// ---------------------------------------------------------------------------
// Pure prompt builder (exported for testing)
// ---------------------------------------------------------------------------

/**
 * Builds the prompt for the AI invoice description generator.
 * Pure function — no side effects, no network calls.
 */
export function buildInvoiceDescriptionPrompt(ctx: InvoiceDescriptionCtx): string {
  const clientLine = ctx.clientName
    ? `العميل: ${ctx.clientName}${ctx.clientCompany ? ` (${ctx.clientCompany})` : ""}`
    : "العميل: غير محدد";

  const gigDescLine = ctx.gigDescription
    ? `تفاصيل المشروع: "${ctx.gigDescription}"`
    : "تفاصيل المشروع: غير متوفرة";

  const amountFormatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(ctx.amountSar);

  return `أنت مساعد مستقل سعودي متخصص في صياغة فواتير احترافية. اكتب وصفًا احترافيًا لبند في الفاتورة باللغتين العربية والإنجليزية.

معلومات المشروع:
- عنوان المشروع / الخدمة: "${ctx.gigTitle}"
- ${gigDescLine}
- ${clientLine}
- المبلغ: ${amountFormatted} ر.س

التعليمات:
- اكتب وصفًا دقيقًا ومهنيًا يصف المخرجات الفعلية المذكورة أعلاه.
- اجعل الوصف مناسبًا للسياق التجاري السعودي وللفواتير الرسمية.
- الوصف يجب أن يكون جملة أو جملتين كحد أقصى لكل لغة.
- لا تخترع مخرجات غير مذكورة أعلاه / do not invent deliverables not provided in the context above.
- لا تذكر مبالغ مالية داخل الوصف.
- النتيجة المطلوبة: حقل ar بالعربية وحقل en بالإنجليزية.

مثال على الشكل المطلوب:
- ar: "تصميم هوية بصرية متكاملة تشمل الشعار والألوان والخطوط، مع تسليم ملفات المصدر بصيغ AI وPDF."
- en: "Full brand identity design including logo, color palette, and typography, delivered with source files in AI and PDF formats."

اكتب الوصف الآن:`;
}

// ---------------------------------------------------------------------------
// Zod schema for the structured response
// ---------------------------------------------------------------------------

const DescriptionSchema = z.object({
  ar: z.string().min(1),
  en: z.string().min(1),
});

// ---------------------------------------------------------------------------
// AI call
// ---------------------------------------------------------------------------

/**
 * Generates a professional bilingual invoice line-item description.
 * Returns `{ ar, en }` or null on failure.
 */
export async function generateInvoiceDescription(
  ctx: InvoiceDescriptionCtx
): Promise<{ ar: string; en: string } | null> {
  const prompt = buildInvoiceDescriptionPrompt(ctx);
  try {
    const result = await generateObject({
      model: deepseek(REASONING_MODEL),
      schema: DescriptionSchema,
      prompt,
      abortSignal: AbortSignal.timeout(15_000),
    });
    const { ar, en } = result.object;
    if (!ar.trim() || !en.trim()) return null;
    return { ar: ar.trim(), en: en.trim() };
  } catch (err) {
    console.error("[generateInvoiceDescription] failed", err);
    return null;
  }
}
