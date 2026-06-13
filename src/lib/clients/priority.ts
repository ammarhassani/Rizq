/**
 * Rule-based follow-up priority scoring for clients.
 * Spec M2.6-D — pure module, no I/O, fully unit-testable.
 *
 * Priority rules (documented here, pinned by tests):
 *
 * HIGH when ANY of:
 *   - daysSinceContact is null (never contacted)
 *   - daysSinceContact > 45
 *   - hasActiveProposal is true (awaiting client response — always worth a nudge)
 *   - daysSinceContact > 30 AND totalValueSar >= 5_000 (high-value client going cold)
 *
 * LOW when ALL of:
 *   - daysSinceContact != null AND daysSinceContact < 14
 *   - hasActiveProposal is false
 *   (recently contacted, nothing waiting — leave them alone)
 *
 * MEDIUM: everything else
 *   - contacted 14–30 days ago, no active proposal
 *   - contacted 31–45 days ago, low-value, no active proposal
 *   - avg payment days slow but no other signal
 */

export type PriorityInput = {
  daysSinceContact: number | null; // null = never contacted
  totalValueSar: number;            // this client's lifetime paid value
  avgPaymentDays: number | null;    // null = unknown
  hasActiveProposal: boolean;       // a sent/viewed proposal awaiting response
};

export type FollowUpPriority = "low" | "medium" | "high";

/** HIGH_VALUE_THRESHOLD: clients who paid ≥ this SAR total are treated as
 *  high-value for the "going cold" rule. */
const HIGH_VALUE_THRESHOLD = 5_000;

/** RECENT_DAYS: contact within this many days + no active proposal → low. */
const RECENT_DAYS = 14;

/** WARM_DAYS: contact within this many days is still "warm". */
const WARM_DAYS = 30;

/** COLD_DAYS: contact older than this always → high. */
const COLD_DAYS = 45;

export function scoreFollowUpPriority(i: PriorityInput): FollowUpPriority {
  const { daysSinceContact, totalValueSar, hasActiveProposal } = i;

  // ── HIGH conditions ────────────────────────────────────────────────────
  // Never contacted → high (no relationship yet or lost track)
  if (daysSinceContact === null) return "high";

  // Active proposal waiting → always high (money on the table)
  if (hasActiveProposal) return "high";

  // Very cold (> 45 days) → high regardless of value
  if (daysSinceContact > COLD_DAYS) return "high";

  // High-value client going warm (> 30 days) → high
  if (daysSinceContact > WARM_DAYS && totalValueSar >= HIGH_VALUE_THRESHOLD) return "high";

  // ── LOW conditions ─────────────────────────────────────────────────────
  // Recently contacted (< 14 days) + no active proposal → low
  if (daysSinceContact < RECENT_DAYS) return "low";

  // ── MEDIUM fallback ────────────────────────────────────────────────────
  return "medium";
}

// ─── Default next-action suggestion ──────────────────────────────────────────

/**
 * Returns a short, actionable suggestion string based on priority.
 * Pure function — no AI, no I/O.
 *
 * @param priority - computed follow-up priority
 * @param daysSinceContact - days since last contact (null = never)
 * @param locale - "ar" | "en"
 */
export function defaultNextAction(
  priority: FollowUpPriority,
  daysSinceContact: number | null,
  locale: "ar" | "en"
): string {
  const isAr = locale === "ar";

  if (priority === "high") {
    if (daysSinceContact === null) {
      return isAr
        ? "تواصل مع العميل لأول مرة وابنِ علاقة"
        : "Reach out to this client for the first time and build a relationship";
    }
    if (daysSinceContact > COLD_DAYS) {
      return isAr
        ? "تواصل عاجل — مرّ وقت طويل على آخر تواصل"
        : "Urgent follow-up — it has been a long time since last contact";
    }
    // hasActiveProposal = true path
    return isAr
      ? "تابع العرض المُرسَل — العميل لم يرد بعد"
      : "Follow up on the sent proposal — client hasn't responded yet";
  }

  if (priority === "medium") {
    return isAr
      ? "تابع العميل قريبًا لإبقاء العلاقة دافئة"
      : "Follow up with this client soon to keep the relationship warm";
  }

  // low
  return isAr
    ? "لا حاجة لمتابعة عاجلة — التواصل حديث"
    : "No urgent follow-up needed — contact is recent";
}
