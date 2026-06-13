import { generateText } from "ai";
import { deepseek, REASONING_MODEL } from "@/lib/ai/client";
import type { Scope } from "@/lib/ai/scope";

/**
 * Returns a 1-sentence Arabic summary of what changed between two scope
 * objects (used for proposal_versions.change_summary).
 *
 * Uses DeepSeek generateText with a 10s timeout; returns null on any failure
 * (caller stores null — non-fatal).
 */
export async function summarizeChange(
  beforeScope: Scope,
  afterScope: Scope
): Promise<string | null> {
  try {
    const result = await generateText({
      model: deepseek(REASONING_MODEL),
      prompt: `أنت مساعد يلخّص الفروق بين نسختين من نطاق عمل مقترح تجاري باللغة العربية.

النطاق السابق:
${JSON.stringify(beforeScope, null, 2)}

النطاق الجديد:
${JSON.stringify(afterScope, null, 2)}

اكتب جملة واحدة فقط باللغة العربية تصف أهم ما تغيّر بين النسختين. لا تذكر أي أرقام من خارج النصوص أعلاه. لا تضف مقدمة أو خاتمة.`,
      abortSignal: AbortSignal.timeout(10_000),
    });
    const text = result.text.trim();
    return text.length > 0 ? text : null;
  } catch (err) {
    console.error("[summarizeChange] failed", err);
    return null;
  }
}
