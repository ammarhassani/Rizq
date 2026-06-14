import { generateText } from "ai";
import { deepseek, REASONING_MODEL } from "@/lib/ai/client";

/** Extract tokens that must survive a tone rewrite: numeric runs (Western or
 *  Arabic-Indic digits, incl. separators / % ), so prices, percentages, and
 *  dates can't be silently altered. */
export function extractProtectedTokens(text: string): string[] {
  // ٪ = U+066A Arabic Percent Sign (extends the ASCII % in the spec to cover
  // Arabic-Indic percentage notation such as "٥٠٪").
  const matches = text.match(/[\d٠-٩][\d٠-٩.,/:%-٪]*/g) ?? [];
  return matches.map((m) => m.trim()).filter((m) => m.length > 0);
}

/** True if every protected token from `original` still appears in `rewritten`. */
export function preservesData(original: string, rewritten: string): boolean {
  return extractProtectedTokens(original).every((tok) => rewritten.includes(tok));
}

/** Rewrite one section's text in the given tone via DeepSeek; returns the
 *  rewrite ONLY if it preserves protected tokens, else the original (fail-safe). */
export async function rewriteSectionTone(
  text: string,
  toneInstruction: string
): Promise<{ text: string; modified: boolean }> {
  if (!text.trim()) return { text, modified: false };
  try {
    const result = await generateText({
      model: deepseek(REASONING_MODEL),
      prompt: `${toneInstruction}\n\nRewrite the following proposal section text in that tone. Output ONLY the rewritten text, same language, no preamble. Preserve every number, price, percentage, date, and proper name exactly.\n\n"""${text}"""`,
      abortSignal: AbortSignal.timeout(10_000),
    });
    const out = result.text.trim();
    if (!out || !preservesData(text, out)) return { text, modified: false };
    return { text: out, modified: true };
  } catch (err) {
    console.error("[rewriteSectionTone] failed", err);
    return { text, modified: false };
  }
}

export type ToneSection = { id: string; text: string };

/** Rewrite each provided (aiEditable) section in the tone; returns rewritten
 *  sections + the ids actually changed. */
export async function adjustTone(
  sections: ToneSection[],
  toneInstruction: string
): Promise<{ sections: ToneSection[]; modified: string[] }> {
  const modified: string[] = [];
  const rewritten = await Promise.all(
    sections.map(async (s) => {
      const r = await rewriteSectionTone(s.text, toneInstruction);
      if (r.modified) modified.push(s.id);
      return { id: s.id, text: r.text };
    })
  );
  return { sections: rewritten, modified };
}
