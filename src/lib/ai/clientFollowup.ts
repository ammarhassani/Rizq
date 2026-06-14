/**
 * Client follow-up draft AI module — spec M2.6-B.
 * Drafts a 2–3 sentence Saudi-polite Arabic WhatsApp check-in message.
 * Server-only.
 */
import "server-only";
import { generateText } from "ai";
import { deepseek, REASONING_MODEL } from "@/lib/ai/client";

export type ClientFollowupCtx = {
  name: string;
  company: string | null;
  lastGigDescription: string | null;
  lastGigDate: string | null;
  daysSinceContact: number | null;
  tone: "formal" | "balanced" | "friendly";
};

/**
 * Drafts a short Arabic follow-up message ready to paste into WhatsApp.
 * Returns the draft string, or null on failure.
 */
export async function draftFollowup(ctx: ClientFollowupCtx): Promise<string | null> {
  const prompt = buildFollowupPrompt(ctx);
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
    console.error("[draftFollowup] failed", err);
    return null;
  }
}

function toneInstruction(tone: ClientFollowupCtx["tone"]): string {
  switch (tone) {
    case "formal":
      return "النبرة: رسمية ومحترمة جدًا، مناسبة لتواصل مؤسسي.";
    case "friendly":
      return "النبرة: ودية وحميمة، مناسبة لعميل تعرفه جيدًا.";
    case "balanced":
    default:
      return "النبرة: متوازنة — محترمة لكن ودية، مناسبة لمعظم العملاء السعوديين.";
  }
}

function buildFollowupPrompt(ctx: ClientFollowupCtx): string {
  const recipientDesc = ctx.company ? `${ctx.name} (${ctx.company})` : ctx.name;
  const lastGigLine = ctx.lastGigDescription
    ? `آخر مشروع مشترك: "${ctx.lastGigDescription}"${ctx.lastGigDate ? ` بتاريخ ${ctx.lastGigDate}` : ""}.`
    : "لا يوجد سجل مشاريع سابقة.";
  const dayLine =
    ctx.daysSinceContact != null
      ? `مر على آخر تواصل ${ctx.daysSinceContact} يومًا.`
      : "لم يسبق التواصل مع هذا العميل من قبل.";

  return `أنت مستقل سعودي محترف. اكتب رسالة متابعة قصيرة (جملتان إلى ثلاث جمل فقط) باللغة العربية لإرسالها عبر واتساب إلى:
${recipientDesc}

${lastGigLine}
${dayLine}

${toneInstruction(ctx.tone)}

القواعد:
- الرسالة جاهزة للنسخ واللصق مباشرة في واتساب.
- لا تبدأ بـ "رسالة متابعة:" أو أي عنوان — فقط نص الرسالة مباشرة.
- لا تذكر أسعارًا أو طلبات مباشرة — المقصود بقاء العلاقة دافئة فقط.
- استخدم تحية سعودية مناسبة.
- لا تتجاوز 3 جمل.
- لا تخترع معلومات غير موجودة أعلاه.

اكتب الرسالة الآن:`;
}
