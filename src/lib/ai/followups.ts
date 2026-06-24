import "server-only";

/**
 * AI clarifying-question generator (feature 001 / US3).
 *
 * Replaces the fixed `follow_up_question_templates` selection with 1–3 questions
 * tailored to the specific brief — only what is genuinely missing/ambiguous and
 * would change scope or price. Returns the existing `FollowUpTemplate` shape so
 * the answer/merge/pricing path and the FollowUpCards UI are untouched.
 *
 * Degrades to `[]` when AI is unconfigured or on any error/timeout; the caller
 * then falls back to the deterministic table selection (graceful degradation).
 */

import { generateObject } from "ai";
import { z } from "zod";
import { deepseek, REASONING_MODEL, isAIConfigured } from "./client";
import { toFollowUpTemplates } from "./followupsShape";
import type { FollowUpTemplate } from "@/lib/proposals/followUp";

const QuestionsSchema = z.object({
  questions: z
    .array(
      z.object({
        field_name: z.string().min(1).max(60),
        question_ar: z.string().min(3).max(240),
        question_en: z.string().min(3).max(240),
        // Present ⇒ quick-select; absent/empty ⇒ free-text input (mixed format).
        options: z
          .array(
            z.object({
              value: z.string().min(1).max(60),
              label_ar: z.string().min(1).max(80),
              label_en: z.string().min(1).max(80),
            }),
          )
          .max(5)
          .optional(),
      }),
    )
    .max(3),
});

type ScopeLike = { field_confidence?: Record<string, number> } & Record<string, unknown>;

function buildFollowUpPrompt(briefText: string, scope: ScopeLike): string {
  return `You help a Saudi freelancer turn a client brief into a priced proposal.
Generate UP TO 3 crucial clarifying questions — only ones whose answers are genuinely
missing or ambiguous in the brief AND would change the proposal's scope or price.
If the brief is already clear, return FEWER (or zero) questions.

Rules:
- Each question must be specific to THIS brief — never generic boilerplate.
- Provide both Arabic (question_ar, primary, Saudi-professional) and English (question_en).
- Categorical question: include 2–5 concise options (value + label_ar + label_en).
  Open-ended question: omit options (the UI shows a text box).
- field_name: a short snake_case key. When the answer maps to a known pricing factor,
  prefer that exact key: revisions, urgency, deliverable_count, client_type, ip_transfer,
  geography_target, language_preference. Otherwise use a descriptive snake_case key.
- Do NOT ask about price. Do NOT ask for anything already stated in the brief.

Already-extracted scope (JSON; field_confidence is 0..1 per field):
${JSON.stringify(scope)}

Client brief:
"""${briefText}"""`;
}

export async function generateFollowUps(input: {
  briefText: string;
  scope: ScopeLike;
}): Promise<FollowUpTemplate[]> {
  if (!isAIConfigured()) return [];
  try {
    const result = await generateObject({
      model: deepseek(REASONING_MODEL),
      schema: QuestionsSchema,
      prompt: buildFollowUpPrompt(input.briefText, input.scope),
      abortSignal: AbortSignal.timeout(20_000),
    });

    return toFollowUpTemplates(result.object.questions);
  } catch (err) {
    console.error("[generateFollowUps] failed", err);
    return [];
  }
}
