"use server";

/**
 * HADAF status server action — spec P5.7 / M5.
 * Reads rules from hadaf_rules_config (singleton id=1), reads the user's
 * monthly income from the monthly_income view, applies hadaf_preferences
 * override, calls the pure calculator, and upserts into hadaf_status_cache
 * (7-day TTL). Returns the cached result when valid.
 */

import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { calculateHadafStatus } from "@/lib/hadaf/calculate";
import type { HadafRules, HadafStatus, MonthIncome } from "@/lib/hadaf/calculate";

// ─── Types ────────────────────────────────────────────────────────────────────

export type HadafStatusResult =
  | {
      ok: true;
      status: HadafStatus;
      rules: Pick<HadafRules, "minimum_monthly_income_sar" | "consecutive_months_required" | "subsidy_pct" | "max_subsidy_sar" | "source_url">;
      disclaimer: string;
      ai_action_plan_ar: string | null;
      ai_action_plan_en: string | null;
      generated_at: string | null;
    }
  | { ok: false; code: "unauthorized" | "no_rules" | "error" };

const DISCLAIMER_AR =
  "هذه المعلومات مبنية على الشروط الموثقة لبرنامج دعم العمل الحر (هدف) حتى عام ٢٠٢٦. يرجى التحقق من الشروط المحدثة على موقع هدف الرسمي hrdf.org.sa. رِزق ليست جهة حكومية ولا تقدم استشارات مالية.";

// ─── Action ──────────────────────────────────────────────────────────────────

export async function getHadafStatusAction(opts?: {
  refresh?: boolean;
}): Promise<HadafStatusResult> {
  const supabase = await createSupabaseClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, code: "unauthorized" };

  const userId = userData.user.id;
  const now = new Date();

  // ── Check cache (skip when refresh=true) ─────────────────────────────────
  if (!opts?.refresh) {
    const { data: cached } = await supabase
      .from("hadaf_status_cache")
      .select(
        "current_streak, current_month_status, current_month_income, months_to_qualify, estimated_subsidy, streak_history, ai_action_plan_ar, ai_action_plan_en, generated_at, valid_until"
      )
      .eq("user_id", userId)
      .maybeSingle();

    if (cached?.valid_until && new Date(cached.valid_until as string) > now) {
      // Load rules for the UI (source_url etc.) — always fresh from DB
      const { data: rulesRow } = await supabase
        .from("hadaf_rules_config")
        .select("rules_json")
        .eq("id", 1)
        .single();

      const rules = (rulesRow?.rules_json ?? {}) as HadafRules;

      const cachedStatus: HadafStatus = {
        current_streak: cached.current_streak as number,
        current_month_status: cached.current_month_status as HadafStatus["current_month_status"],
        current_month_income: cached.current_month_income as number,
        months_to_qualify: cached.months_to_qualify as number,
        estimated_subsidy: cached.estimated_subsidy as number | null,
        streak_history: (cached.streak_history as HadafStatus["streak_history"]) ?? [],
      };

      return {
        ok: true,
        status: cachedStatus,
        rules: {
          minimum_monthly_income_sar: rules.minimum_monthly_income_sar ?? 700,
          consecutive_months_required: rules.consecutive_months_required ?? 3,
          subsidy_pct: rules.subsidy_pct ?? 40,
          max_subsidy_sar: rules.max_subsidy_sar ?? null,
          source_url: rules.source_url ?? "https://hrdf.org.sa",
        },
        disclaimer: DISCLAIMER_AR,
        ai_action_plan_ar: cached.ai_action_plan_ar as string | null,
        ai_action_plan_en: cached.ai_action_plan_en as string | null,
        generated_at: cached.generated_at as string | null,
      };
    }
  }

  // ── Load rules from config ────────────────────────────────────────────────
  const { data: rulesRow, error: rulesErr } = await supabase
    .from("hadaf_rules_config")
    .select("rules_json")
    .eq("id", 1)
    .single();

  if (rulesErr || !rulesRow) return { ok: false, code: "no_rules" };

  const rules = (rulesRow.rules_json as HadafRules);

  // ── Load hadaf_preferences (target override) ──────────────────────────────
  const { data: prefs } = await supabase
    .from("hadaf_preferences")
    .select("target_monthly_sar")
    .eq("user_id", userId)
    .maybeSingle();

  // If user has a custom target, override the rule's minimum
  const effectiveRules: HadafRules = {
    ...rules,
    minimum_monthly_income_sar:
      prefs?.target_monthly_sar != null
        ? (prefs.target_monthly_sar as number)
        : rules.minimum_monthly_income_sar,
  };

  // ── Load monthly_income view (last 13 months to be safe) ─────────────────
  // The view exposes: month (date), paid_sar
  // We need YYYY-MM strings and numeric income.
  const thirteenMonthsAgo = new Date(
    now.getFullYear(),
    now.getMonth() - 13,
    1
  ).toISOString();

  const { data: monthlyRows, error: incomeErr } = await supabase
    .from("monthly_income")
    .select("month, paid_sar")
    .gte("month", thirteenMonthsAgo)
    .order("month", { ascending: true });

  if (incomeErr) {
    console.error("[getHadafStatusAction] monthly_income query failed", incomeErr);
    return { ok: false, code: "error" };
  }

  // Map the view rows → MonthIncome
  // The view's `month` column is a date like "2026-06-01T00:00:00.000Z"
  const monthlyIncomes: MonthIncome[] = (monthlyRows ?? [])
    .filter((r) => r.month != null)
    .map((r) => {
      const raw = r.month as string;
      // Parse YYYY-MM from the date string
      const d = new Date(raw);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      return {
        month: ym,
        income: (r.paid_sar as number) ?? 0,
      };
    });

  // ── Run the pure calculator ───────────────────────────────────────────────
  const status = calculateHadafStatus(effectiveRules, monthlyIncomes, now);

  // ── Upsert the cache (7-day TTL) ─────────────────────────────────────────
  const validUntil = new Date(
    now.getTime() + 7 * 24 * 60 * 60 * 1000
  ).toISOString();

  const { error: upsertErr } = await supabase
    .from("hadaf_status_cache")
    .upsert(
      {
        user_id: userId,
        current_streak: status.current_streak,
        current_month_status: status.current_month_status,
        current_month_income: status.current_month_income,
        months_to_qualify: status.months_to_qualify,
        estimated_subsidy: status.estimated_subsidy,
        streak_history: status.streak_history,
        generated_at: now.toISOString(),
        valid_until: validUntil,
        // Preserve existing AI plan (don't overwrite on recalc)
        ai_action_plan_ar: null,
        ai_action_plan_en: null,
      },
      { onConflict: "user_id" }
    );

  if (upsertErr) {
    console.error("[getHadafStatusAction] cache upsert failed", upsertErr);
    // Non-fatal — return the computed status anyway
  }

  return {
    ok: true,
    status,
    rules: {
      minimum_monthly_income_sar: effectiveRules.minimum_monthly_income_sar,
      consecutive_months_required: effectiveRules.consecutive_months_required,
      subsidy_pct: effectiveRules.subsidy_pct,
      max_subsidy_sar: effectiveRules.max_subsidy_sar ?? null,
      source_url: rules.source_url ?? "https://hrdf.org.sa",
    },
    disclaimer: DISCLAIMER_AR,
    ai_action_plan_ar: null,
    ai_action_plan_en: null,
    generated_at: now.toISOString(),
  };
}
