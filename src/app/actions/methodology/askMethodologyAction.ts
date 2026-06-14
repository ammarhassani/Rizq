"use server";

/**
 * Server action: answer a question about Rizq's methodology.
 * Public — no auth required (methodology page is anon-readable).
 * Loads all enabled methodology sections from the DB and passes their
 * content to the AI library as the sole knowledge source.
 *
 * Rate-limit-friendly: question is capped at 500 chars via Zod.
 */

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { answerMethodologyQuestion } from "@/lib/ai/methodologyFaq";

// ─── Input schema ─────────────────────────────────────────────────────────────

const InputSchema = z.object({
  question: z.string().min(1).max(500),
});

// ─── Result type ──────────────────────────────────────────────────────────────

export type AskMethodologyResult =
  | { ok: true; answer: string }
  | { ok: false; code: "invalid_input" | "ai_failed" | "error" };

// ─── Action ──────────────────────────────────────────────────────────────────

export async function askMethodologyAction(
  raw: unknown
): Promise<AskMethodologyResult> {
  // Validate input
  const parsed = InputSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, code: "invalid_input" };
  }
  const { question } = parsed.data;

  try {
    // Load enabled sections (anon read — no auth needed)
    const supabase = await createClient();
    const { data: rows, error } = await supabase
      .from("methodology_sections")
      .select("id, title_ar, title_en, content_ar, content_en")
      .eq("enabled", true)
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("[askMethodologyAction] DB error", error);
      return { ok: false, code: "error" };
    }

    // Build sections text for the AI (bilingual — include both so the model
    // can answer in whatever language the user asked in)
    const sectionsText = (rows ?? [])
      .map((s) => {
        const row = s as {
          id: string;
          title_ar: string;
          title_en: string;
          content_ar: string;
          content_en: string;
        };
        return `### ${row.title_ar} / ${row.title_en}\n${row.content_ar}\n\n${row.content_en}`;
      })
      .join("\n\n---\n\n");

    const answer = await answerMethodologyQuestion(question, sectionsText);
    if (!answer) {
      return { ok: false, code: "ai_failed" };
    }

    return { ok: true, answer };
  } catch (err) {
    console.error("[askMethodologyAction] unexpected error", err);
    return { ok: false, code: "error" };
  }
}
