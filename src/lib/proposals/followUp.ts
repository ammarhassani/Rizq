export type FollowUpOption = { value: string | number; label_ar: string; label_en: string };

/** Mirrors a row of public.follow_up_question_templates. */
export type FollowUpTemplate = {
  id: string;
  field_name: string;
  priority: number;        // 1 = highest (asked first)
  min_confidence: number;  // ask if the field's confidence < this
  question_ar: string;
  question_en: string;
  options_json: FollowUpOption[] | null;
  allow_skip: boolean;
  enabled: boolean;
};

/**
 * Pick the follow-up questions to ask: enabled templates whose target field is
 * under-confident (fieldConfidence[field] ?? 0 < min_confidence), ordered by
 * priority ascending, capped at `max` (default 3). Rule-based, not ML (spec M1.4).
 */
export function selectFollowUps(
  fieldConfidence: Record<string, number>,
  templates: FollowUpTemplate[],
  max = 3
): FollowUpTemplate[] {
  return templates
    .filter((t) => t.enabled && (fieldConfidence[t.field_name] ?? 0) < t.min_confidence)
    .sort((a, b) => a.priority - b.priority)
    .slice(0, Math.max(0, max));
}

/**
 * Merge the freelancer's quick-answers back into a scope-like object: set each
 * answered field to its value and bump that field's confidence to 1.0.
 * Returns a new object (does not mutate input).
 */
export function applyAnswers<T extends { field_confidence: Record<string, number> }>(
  scope: T,
  answers: Record<string, unknown>
): T {
  const field_confidence = { ...scope.field_confidence };
  for (const field of Object.keys(answers)) {
    field_confidence[field] = 1.0;
  }
  // Object.assign lets us write string-keyed properties onto the generic T
  // without triggering TS2862 (can only index generic intersections for reading).
  return Object.assign({}, scope, answers, { field_confidence }) as T;
}
