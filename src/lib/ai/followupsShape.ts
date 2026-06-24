/**
 * Pure (non-server) shaping for AI-generated clarifying questions. Kept separate
 * from `followups.ts` (which is server-only) so it can be unit-tested.
 */
import type { FollowUpTemplate } from "@/lib/proposals/followUp";

export type GeneratedQuestion = {
  field_name: string;
  question_ar: string;
  question_en: string;
  options?: { value: string; label_ar: string; label_en: string }[];
};

/**
 * Map AI-generated questions onto the existing FollowUpTemplate shape the UI and
 * answer/merge path expect: clamp to 3, synthesize id/priority, and convert
 * options → options_json (null when there are none ⇒ the UI renders a text box).
 */
export function toFollowUpTemplates(questions: GeneratedQuestion[]): FollowUpTemplate[] {
  return questions.slice(0, 3).map((q, i) => ({
    id: `ai_${i}_${q.field_name}`,
    field_name: q.field_name,
    priority: i + 1,
    min_confidence: 1, // synthetic — AI questions are not threshold-selected
    question_ar: q.question_ar,
    question_en: q.question_en,
    options_json:
      q.options && q.options.length > 0
        ? q.options.map((o) => ({ value: o.value, label_ar: o.label_ar, label_en: o.label_en }))
        : null,
    allow_skip: true,
    enabled: true,
  }));
}
