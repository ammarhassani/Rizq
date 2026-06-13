/**
 * Invoice overdue-detection helpers — Phase-4 task 4.2.
 *
 * PURE module: no React, no Supabase, no side-effects. Callers always pass
 * `today` explicitly — no hidden `new Date()` calls so tests can fix the clock.
 *
 * Calendar-day comparison:
 *  We compare YYYY-MM-DD strings (after normalising to UTC midnight) so that
 *  timezone drift in `today` does not cause off-by-one errors.  The spec says
 *  "strictly before today" — due TODAY is NOT overdue.
 */

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Parse an ISO date string (YYYY-MM-DD or any Date.parse-able value) to a
 *  UTC midnight Date.  Returns null when the string is empty, null, or unparseable. */
function parseDate(value: string | null): Date | null {
  if (!value) return null;
  // تحويل النص إلى تاريخ UTC منتصف الليل للمقارنة اليومية الصحيحة
  const ts = Date.parse(value);
  if (isNaN(ts)) return null;
  const d = new Date(ts);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/** Normalise a Date to UTC midnight so time-of-day in `today` is stripped. */
function toUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns true when an invoice is overdue.
 *
 * Rules:
 *  - status must be 'sent' or 'viewed' (already delivered to client)
 *  - dueDate must be a valid date STRICTLY before `today` (calendar days)
 *  - 'paid', 'draft', 'cancelled', 'overdue' status → always false
 *  - null dueDate → false (no deadline set)
 *  - due TODAY → false (not yet past)
 *
 * @param status   - invoice status string from the DB enum
 * @param dueDate  - ISO date string or null
 * @param today    - caller-supplied current date (never call new Date() here)
 */
export function isOverdue(
  status: string,
  dueDate: string | null,
  today: Date
): boolean {
  if (status !== "sent" && status !== "viewed") return false;

  const due = parseDate(dueDate);
  if (due === null) return false;

  const todayDay = toUtcDay(today);
  // صارم: يجب أن يكون تاريخ الاستحقاق قبل اليوم الحالي (ليس مساوياً له)
  return due < todayDay;
}

/**
 * Returns the number of whole calendar days an invoice is past its due date.
 * Returns 0 when the due date is today, in the future, or invalid.
 *
 * @param dueDate  - ISO date string or null
 * @param today    - caller-supplied current date
 */
export function daysOverdue(dueDate: string | null, today: Date): number {
  const due = parseDate(dueDate);
  if (due === null) return 0;

  const todayDay = toUtcDay(today);
  const diffMs = todayDay.getTime() - due.getTime();
  if (diffMs <= 0) return 0;

  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}
