"use server";

import { createClient } from "@/lib/supabase/server";

// ---------------------------------------------------------------------------
// Return type
// ---------------------------------------------------------------------------

export type ExportIncomeCsvResult =
  | { ok: true; csv: string; filename: string }
  | { ok: false; code: "unauthorized" | "upgrade" | "error" };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Escape a CSV cell value: wrap in double-quotes if it contains
 * commas, double-quotes, or newlines; escape interior double-quotes.
 */
function escapeCsvCell(value: string | number | null | undefined): string {
  const str = value == null ? "" : String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function buildCsvRow(cells: (string | number | null | undefined)[]): string {
  return cells.map(escapeCsvCell).join(",");
}

// ---------------------------------------------------------------------------
// Server action
// ---------------------------------------------------------------------------

/**
 * Pro-gated CSV export of the owner's monthly_income view.
 * Phase-3 task 3.12.
 *
 * Returns { ok, csv, filename } for Pro users.
 * Returns { ok: false, code: 'upgrade' } for free users.
 */
export async function exportIncomeCsv(): Promise<ExportIncomeCsvResult> {
  const supabase = await createClient();

  // Auth guard
  const { data: userResult } = await supabase.auth.getUser();
  if (!userResult.user) return { ok: false, code: "unauthorized" };
  const userId = userResult.user.id;

  // Pro gate — public.users.role is the single source of truth for tier
  // across the app (quota triggers, clientAi, incomeAi all read it). There is
  // no separate `subscriptions` table; gate on role here too.
  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", userId)
    .single();

  const role = (profile?.role ?? "free") as string;
  if (role !== "pro" && role !== "admin") {
    return { ok: false, code: "upgrade" };
  }

  // Fetch all monthly_income rows for this user, ordered by month
  const { data: rows, error } = await supabase
    .from("monthly_income")
    .select("month, gig_count, total_sar, paid_sar, pending_sar, overdue_sar")
    .order("month", { ascending: true });

  if (error) {
    console.error("[exportIncomeCsv] query failed", {
      code: error.code,
      message: error.message,
    });
    return { ok: false, code: "error" };
  }

  // Build CSV
  const header = buildCsvRow([
    "month",
    "gig_count",
    "total_sar",
    "paid_sar",
    "pending_sar",
    "overdue_sar",
  ]);

  const dataRows = (rows ?? []).map((r) => {
    // Format month as ISO YYYY-MM (the view returns a date, take first 7 chars)
    const month = r.month ? String(r.month).slice(0, 7) : "";
    return buildCsvRow([
      month,
      r.gig_count ?? 0,
      r.total_sar ?? 0,
      r.paid_sar ?? 0,
      r.pending_sar ?? 0,
      r.overdue_sar ?? 0,
    ]);
  });

  const csv = [header, ...dataRows].join("\n");

  const now = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const filename = `rizq-income-${now}.csv`;

  return { ok: true, csv, filename };
}
