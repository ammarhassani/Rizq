/**
 * Methodology FAQ AI module — spec P6.2 (M7).
 * Answers questions ONLY from the published methodology content.
 * Out-of-scope questions get an honest refusal — no fabrication.
 * Server-only.
 */
import "server-only";
import { generateText } from "ai";
import { deepseek, REASONING_MODEL } from "@/lib/ai/client";

// ─── Prompt builder ───────────────────────────────────────────────────────────

/**
 * Builds the FAQ prompt. Pure function — exported for unit tests.
 *
 * Rules enforced in the prompt:
 * 1. Answer ONLY from sectionsText; never fabricate.
 * 2. Respond in the same language the question is asked in.
 * 3. Cite the section title when applicable.
 * 4. Out-of-scope → fixed Arabic/English refusal phrase.
 */
export function buildMethodologyFaqPrompt(
  question: string,
  sectionsText: string
): string {
  return `أنت مساعد رِزق للإجابة على أسئلة المنهجية. لديك فقط المحتوى المنشور أدناه.

قواعد صارمة:
- أجب فقط بناءً على المحتوى المنشور أدناه. لا تخترع أي معلومة.
- إذا كان السؤال خارج نطاق المنهجية أو لا تجد له إجابة في المحتوى، أجب حرفياً بهذه الجملة ولا شيء آخر: "هذا السؤال خارج نطاق المنهجية المنشورة."
- إذا كان السؤال بالإنجليزية، أجب بالإنجليزية. إذا كان بالعربية، أجب بالعربية. إذا كان مختلطاً، أجب بالعربية.
- عند الإجابة، اذكر اسم القسم ذي الصلة إن وجد (مثل: "وفق قسم كيف نجمع البيانات...").
- لا تتجاوز 5 جمل. لا تضف مقدمات. لا تقل "بالطبع" أو "شكراً".
- هذه إجابة آلية مبنية على المنهجية المنشورة فقط — وضّح ذلك بجملة واحدة في نهاية الإجابة إذا كانت الإجابة من النطاق.

المحتوى المنشور (منهجية رِزق):
${sectionsText}

السؤال: ${question}

الإجابة:`;
}

// ─── Answering function ───────────────────────────────────────────────────────

/**
 * Answers a methodology question using the published sections as the sole
 * knowledge source. Returns null on any error (network, timeout, parse).
 * Timeout: 12 seconds.
 */
export async function answerMethodologyQuestion(
  question: string,
  sectionsText: string
): Promise<string | null> {
  const prompt = buildMethodologyFaqPrompt(question, sectionsText);
  try {
    const result = await generateText({
      model: deepseek(REASONING_MODEL),
      prompt,
      abortSignal: AbortSignal.timeout(12_000),
    });
    const text = result.text.trim();
    if (!text) return null;
    return text;
  } catch (err) {
    console.error("[answerMethodologyQuestion] failed", err);
    return null;
  }
}
