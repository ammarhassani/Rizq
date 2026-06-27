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
 * Coerce follow-up answers onto the typed scope schema before merging.
 *
 * AI-generated questions return option `value`s as STRINGS (e.g. "3 rounds"),
 * but structured scope fields are typed: `revisions`/`deliverable_count` are
 * numbers and `ip_transfer` is an enum. Without coercion a string answer never
 * applies (it fails the `typeof === "number"` read and falls back to a default).
 * This maps the known fields to their proper types and drops unrepresentable
 * values; unknown fields pass through unchanged. Pure. (feature 001 / 005)
 */
const INT_FIELDS = new Set(["revisions", "deliverable_count"]);

function coerceInt(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return Math.trunc(v);
  if (typeof v === "string") {
    const m = v.match(/\d+/);
    if (m) return parseInt(m[0], 10);
  }
  return undefined; // e.g. "unlimited" / free text → not representable, keep the default
}

function coerceIpTransfer(v: unknown): "full_transfer" | "license" | "unclear" | undefined {
  if (typeof v !== "string") return undefined;
  const s = v.trim().toLowerCase();
  if (s === "full_transfer" || /full[_\s-]?transfer|نقل كامل|ملكية كاملة|تنازل/.test(s)) return "full_transfer";
  if (s === "license" || /licen[cs]e|ترخيص|استخدام/.test(s)) return "license";
  if (s === "unclear") return "unclear";
  return undefined;
}

export function normalizeAnswers(answers: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...answers };
  for (const key of Object.keys(out)) {
    if (INT_FIELDS.has(key)) {
      const n = coerceInt(out[key]);
      if (n === undefined) delete out[key];
      else out[key] = key === "revisions" ? Math.max(0, Math.min(20, n)) : Math.max(1, n);
    } else if (key === "ip_transfer") {
      const ip = coerceIpTransfer(out[key]);
      if (ip === undefined) delete out[key];
      else out[key] = ip;
    }
  }
  return out;
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
