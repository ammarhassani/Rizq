/**
 * Invoice data helpers — Phase-4 task P4.7.
 *
 * SERVER-SAFE, NOT "use server". Callers pass a Supabase client instance so
 * this module works in server components, server actions, and edge functions.
 *
 * M0 (overdue widget) and M9 (calendar feed) will consume these in Phase 5.
 * Keep these pure-of-clock where reasonable: accept an optional `today` param
 * that defaults to `new Date()` so tests can fix the clock.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type UpcomingInvoice = {
  id: string;
  invoice_number: string;
  total_sar: number;
  due_date: string;
  status: string;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Format a Date to a YYYY-MM-DD ISO string (UTC calendar day). */
function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// getOverdueInvoiceCount
// ---------------------------------------------------------------------------

/**
 * Count overdue invoices for a user.
 *
 * An invoice is considered overdue if:
 *   - Its status is 'overdue' (already flagged in DB), OR
 *   - Its status is 'sent' or 'viewed' AND due_date < today (calendar-day strict).
 *
 * Owner-scoped: explicit `.eq("user_id", userId)` in addition to RLS.
 *
 * @param supabase - authenticated Supabase client (server-side, owns RLS session)
 * @param userId   - the authenticated user's UUID (for explicit owner scoping)
 * @param today    - optional: defaults to `new Date()` (injectable for tests)
 *
 * M0 (dashboard overdue widget) will call this in Phase 5.
 */
export async function getOverdueInvoiceCount(
  supabase: SupabaseClient,
  userId: string,
  today: Date = new Date()
): Promise<number> {
  const todayIso = toIsoDate(today);

  // Count rows that are explicitly status='overdue'
  const { count: explicitCount, error: e1 } = await supabase
    .from("invoices")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "overdue");

  if (e1) {
    console.error("[getOverdueInvoiceCount] explicit overdue query failed", e1.message);
    return 0;
  }

  // Count rows that are sent/viewed with a due_date strictly before today
  const { count: implicitCount, error: e2 } = await supabase
    .from("invoices")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .in("status", ["sent", "viewed"])
    .lt("due_date", todayIso);

  if (e2) {
    console.error("[getOverdueInvoiceCount] implicit overdue query failed", e2.message);
    return explicitCount ?? 0;
  }

  return (explicitCount ?? 0) + (implicitCount ?? 0);
}

// ---------------------------------------------------------------------------
// getUpcomingInvoiceDueDates
// ---------------------------------------------------------------------------

/**
 * Return invoices with an upcoming (non-null, future or today) due date in
 * unpaid statuses (sent / viewed / overdue), ordered by due_date asc.
 *
 * M9 (calendar feed) will call this in Phase 5.
 *
 * @param supabase - authenticated Supabase client
 * @param userId   - the authenticated user's UUID
 * @param opts     - optional config
 *   today  - injectable clock anchor; defaults to `new Date()`
 *   limit  - max rows to return (default: 60, enough for ~2 months)
 */
export async function getUpcomingInvoiceDueDates(
  supabase: SupabaseClient,
  userId: string,
  opts?: { today?: Date; limit?: number }
): Promise<UpcomingInvoice[]> {
  const today = opts?.today ?? new Date();
  const limit = opts?.limit ?? 60;
  const todayIso = toIsoDate(today);

  const { data, error } = await supabase
    .from("invoices")
    .select("id, invoice_number, total_sar, due_date, status")
    .eq("user_id", userId)
    .in("status", ["sent", "viewed", "overdue"])
    .not("due_date", "is", null)
    .gte("due_date", todayIso)
    .order("due_date", { ascending: true })
    .limit(limit);

  if (error) {
    console.error("[getUpcomingInvoiceDueDates] query failed", error.message);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id as string,
    invoice_number: row.invoice_number as string,
    total_sar: Number(row.total_sar),
    due_date: row.due_date as string,
    status: row.status as string,
  }));
}
