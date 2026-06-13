import { generateObject } from "ai";
import { z } from "zod";
import { deepseek, REASONING_MODEL } from "@/lib/ai/client";

/** Comparison only runs with >= 3 past proposals (spec M1.11-C). */
export function canCompare(pastCount: number): boolean {
  return pastCount >= 3;
}

const CompareSchema = z.object({
  summary_ar: z.string(),
  summary_en: z.string(),
});

/** Anonymized scope dimensions of one past proposal (no client data). */
export type ScopeDims = {
  specialty: string;
  deliverable_count: number | null;
  revisions: number | null;
  price_anchor: number;
};

/** Returns a labeled bilingual insight comparing the current scope to the
 *  freelancer's past proposals, or null when <3 past (spec M1.11-C). */
export async function compareScope(
  current: ScopeDims,
  past: ScopeDims[]
): Promise<{ ar: string; en: string } | null> {
  if (!canCompare(past.length)) return null;
  try {
    const result = await generateObject({
      model: deepseek(REASONING_MODEL),
      schema: CompareSchema,
      prompt: `Compare this Saudi freelancer's CURRENT project scope to their PAST projects (anonymized dimensions only — no client data). Note differences in deliverable count, revisions, and price vs their typical. 1–2 sentences each language, Saudi-polite, factual, no fabrication.\nCURRENT: ${JSON.stringify(current)}\nPAST: ${JSON.stringify(past)}`,
      abortSignal: AbortSignal.timeout(10_000),
    });
    // Honesty label (spec §II.2 / D9).
    return {
      ar: `تحليل رِزق — ${result.object.summary_ar}`,
      en: `Rizq Insight — ${result.object.summary_en}`,
    };
  } catch (err) {
    console.error("[compareScope] failed", err);
    return null;
  }
}
