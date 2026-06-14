"use server";

/**
 * PDPL Phase 6.11 — Data export action.
 * Collects all rows owned by the calling user and returns a JSON string
 * for client-side download. Each table fetch is defensive: a failure on
 * one table yields an empty array and does NOT abort the whole export.
 */

import { createClient } from "@/lib/supabase/server";

// ── Return type ──────────────────────────────────────────────────────────────

export type ExportMyDataResult =
  | { ok: true; json: string; filename: string }
  | { ok: false; code: "unauthorized" | "error" };

// ── Safe per-table fetch helper ──────────────────────────────────────────────

/**
 * Wraps any supabase query in a try/catch so a single failing table does
 * not abort the whole export. Returns an empty array on failure.
 */
async function safeFetch<T>(
  fn: () => PromiseLike<{ data: T[] | null; error: unknown }>
): Promise<T[]> {
  try {
    const { data, error } = await fn();
    if (error) {
      console.warn("[exportMyData] table fetch error (continuing)", error);
      return [];
    }
    return data ?? [];
  } catch (err) {
    console.warn("[exportMyData] unexpected fetch error (continuing)", err);
    return [];
  }
}

// ── Main action ──────────────────────────────────────────────────────────────

/**
 * exportMyDataAction — assembles a full JSON data package for the calling
 * user. Owner-scoped only. Returns { ok, json, filename }.
 */
export async function exportMyDataAction(): Promise<ExportMyDataResult> {
  const supabase = await createClient();

  // Auth guard
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, code: "unauthorized" };
  const uid = userData.user.id;

  try {
    // ── 1. Profile ──
    const profileRaw = await safeFetch(() =>
      supabase
        .from("users")
        .select(
          "id, email, name, role, city, specialty_id, preferred_language, onboarded_at, created_at, updated_at"
        )
        .eq("id", uid)
    );
    const profile = profileRaw[0] ?? null;

    // ── 2. Proposals ──
    const proposals = await safeFetch(() =>
      supabase
        .from("proposals")
        .select(
          "id, brief_text, scope_json, status, price_min, price_anchor, price_max, sample_size, public_share, created_at, updated_at, finalized_at, expires_at, client_id, client_name, tone_adjustments, artifact_json"
        )
        .eq("user_id", uid)
        .order("created_at", { ascending: false })
    );

    // ── 3. Proposal versions ──
    const proposalVersions = await safeFetch(() =>
      supabase
        .from("proposal_versions")
        .select(
          "id, proposal_id, version, scope_json, price_min, price_anchor, price_max, change_reason, created_at"
        )
        .eq("user_id", uid)
        .order("created_at", { ascending: false })
    );

    // ── 4. Clients ──
    const clients = await safeFetch(() =>
      supabase
        .from("clients")
        .select(
          "id, name, name_en, company, title, email, phone, city, client_type, source, tags, rating, first_contacted_at, last_contacted_at, total_gigs, total_value_sar, avg_payment_days, follow_up_priority, is_active, created_at, updated_at"
        )
        .eq("user_id", uid)
        .order("created_at", { ascending: false })
    );

    // ── 5. Client timeline ──
    const clientTimeline = await safeFetch(() =>
      supabase
        .from("client_timeline")
        .select("id, client_id, event_type, event_data, ai_summary, created_at")
        .eq("user_id", uid)
        .order("created_at", { ascending: false })
    );

    // ── 6. Gigs ──
    const gigs = await safeFetch(() =>
      supabase
        .from("gigs")
        .select(
          "id, client_id, proposal_id, title, category, description, amount_sar, deposit_pct, deposit_sar, remaining_sar, start_date, delivery_date, completed_date, status, payment_method, payment_notes, ai_anomaly_flag, created_at, updated_at"
        )
        .eq("user_id", uid)
        .order("created_at", { ascending: false })
    );

    // ── 7. Income projections ──
    const incomeProjections = await safeFetch(() =>
      supabase
        .from("income_projections")
        .select(
          "user_id, current_month_projection, next_month_projection, confidence_low, confidence_high, projection_basis, generated_at, valid_until"
        )
        .eq("user_id", uid)
    );

    // ── 8. Invoices ──
    const invoices = await safeFetch(() =>
      supabase
        .from("invoices")
        .select(
          "id, client_id, gig_id, proposal_id, invoice_number, invoice_sequence, description, items, subtotal_sar, vat_pct, vat_sar, total_sar, status, created_at, updated_at"
        )
        .eq("user_id", uid)
        .order("created_at", { ascending: false })
    );

    // ── 9. Documents (metadata only — NOT file bytes) ──
    const documents = await safeFetch(() =>
      supabase
        .from("documents")
        .select(
          "id, client_id, title_ar, title_en, description_ar, file_name, file_size, file_type, category, expiry_date, expired, created_at, updated_at"
        )
        .eq("user_id", uid)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
    );

    // ── 10. Rate calculator defaults ──
    const rateCalculatorDefaults = await safeFetch(() =>
      supabase
        .from("rate_calculator_defaults")
        .select(
          "user_id, monthly_target_sar, working_days_per_month, hours_per_day, projects_per_month_target, specialty_id, city_id, experience_tier_id, updated_at"
        )
        .eq("user_id", uid)
    );

    // ── 11. Dashboard preferences ──
    const dashboardPreferences = await safeFetch(() =>
      supabase
        .from("dashboard_preferences")
        .select("user_id, widgets, layout, updated_at")
        .eq("user_id", uid)
    );

    // ── 12. Calendar preferences ──
    const calendarPreferences = await safeFetch(() =>
      supabase
        .from("calendar_preferences")
        .select(
          "user_id, default_view, show_hijri, enabled_sources, working_days, working_hours_start, working_hours_end, updated_at"
        )
        .eq("user_id", uid)
    );

    // ── 13. Hadaf preferences ──
    const hadafPreferences = await safeFetch(() =>
      supabase
        .from("hadaf_preferences")
        .select(
          "user_id, target_monthly_sar, bahr_only, notifications_enabled, updated_at"
        )
        .eq("user_id", uid)
    );

    // ── 14. Hadaf status cache ──
    const hadafStatusCache = await safeFetch(() =>
      supabase
        .from("hadaf_status_cache")
        .select(
          "user_id, current_streak, current_month_status, current_month_income, months_to_qualify, estimated_subsidy, streak_history, generated_at, valid_until"
        )
        .eq("user_id", uid)
    );

    // ── Assemble ─────────────────────────────────────────────────────────────
    const payload = {
      exported_at: new Date().toISOString(),
      user_id: uid,
      profile,
      proposals,
      proposal_versions: proposalVersions,
      clients,
      client_timeline: clientTimeline,
      gigs,
      income_projections: incomeProjections,
      invoices,
      documents,
      rate_calculator_defaults: rateCalculatorDefaults[0] ?? null,
      dashboard_preferences: dashboardPreferences[0] ?? null,
      calendar_preferences: calendarPreferences[0] ?? null,
      hadaf_preferences: hadafPreferences[0] ?? null,
      hadaf_status_cache: hadafStatusCache[0] ?? null,
    };

    const json = JSON.stringify(payload, null, 2);
    const idPrefix = uid.slice(0, 8);
    const filename = `rizq-data-export-${idPrefix}.json`;

    return { ok: true, json, filename };
  } catch (err) {
    console.error("[exportMyData] fatal error", err);
    return { ok: false, code: "error" };
  }
}
