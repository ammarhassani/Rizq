"use server";

/**
 * HADAF AI action plan server action — spec P5.8 / M5.6.
 * Only meaningful when current_month_status is 'not_qualifying'.
 * Gathers owner-scoped context (proposals, gigs, clients, income),
 * calls generateHadafActionPlan, stores result in hadaf_status_cache.
 */

import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import {
  generateHadafActionPlan,
  type HadafActionPlanCtx,
} from "@/lib/ai/hadafActionPlan";

// ─── Types ────────────────────────────────────────────────────────────────────

export type HadafActionPlanResult =
  | { ok: true; ar: string; en: string }
  | {
      ok: false;
      code:
        | "unauthorized"
        | "not_applicable"
        | "no_rules"
        | "ai_failed"
        | "error";
    };

// ─── Action ──────────────────────────────────────────────────────────────────

export async function generateHadafActionPlanAction(): Promise<HadafActionPlanResult> {
  const supabase = await createSupabaseClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, code: "unauthorized" };

  const userId = userData.user.id;
  const now = new Date();

  // ── Check current status from cache ──────────────────────────────────────
  const { data: cached } = await supabase
    .from("hadaf_status_cache")
    .select(
      "current_month_status, current_month_income"
    )
    .eq("user_id", userId)
    .maybeSingle();

  // Only generate when not qualifying
  const status = cached?.current_month_status as string | null;
  if (!cached || status !== "not_qualifying") {
    return { ok: false, code: "not_applicable" };
  }

  // ── Load rules for target income ─────────────────────────────────────────
  const { data: rulesRow } = await supabase
    .from("hadaf_rules_config")
    .select("rules_json")
    .eq("id", 1)
    .single();

  if (!rulesRow) return { ok: false, code: "no_rules" };

  const rules = rulesRow.rules_json as {
    minimum_monthly_income_sar: number;
  };

  // Load user's custom target (if any)
  const { data: prefs } = await supabase
    .from("hadaf_preferences")
    .select("target_monthly_sar")
    .eq("user_id", userId)
    .maybeSingle();

  const targetIncome =
    prefs?.target_monthly_sar != null
      ? (prefs.target_monthly_sar as number)
      : rules.minimum_monthly_income_sar;

  const currentIncome = (cached.current_month_income as number) ?? 0;

  // ── Days remaining in current month ──────────────────────────────────────
  const lastDayOfMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0
  ).getDate();
  const daysRemaining = Math.max(0, lastDayOfMonth - now.getDate());

  // ── Active proposals (sent + viewed, owner-scoped) ───────────────────────
  const { data: proposalRows } = await supabase
    .from("proposals")
    .select("title, price_anchor, client_name, created_at")
    .eq("user_id", userId)
    .in("status", ["sent", "viewed"])
    .order("created_at", { ascending: false })
    .limit(5);

  const activeProposals = (proposalRows ?? []).map((p) => {
    const sentAt = p.created_at ? new Date(p.created_at as string) : now;
    const daysSinceSent = Math.floor(
      (now.getTime() - sentAt.getTime()) / (1000 * 60 * 60 * 24)
    );
    return {
      title: p.title as string | null,
      price_anchor: p.price_anchor as number | null,
      client: p.client_name as string | null,
      days_since_sent: daysSinceSent,
    };
  });

  // ── In-progress gigs (owner-scoped) ──────────────────────────────────────
  const { data: gigRows } = await supabase
    .from("gigs")
    .select("title, amount_sar")
    .eq("user_id", userId)
    .in("status", ["in_progress", "deposit_paid", "delivered"])
    .limit(5);

  const inProgressGigs = (gigRows ?? []).map((g) => ({
    title: g.title as string,
    amount_sar: (g.amount_sar as number) ?? 0,
  }));

  // ── Clients needing follow-up (>30 days, owner-scoped) ───────────────────
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { data: clientRows } = await supabase
    .from("clients")
    .select("name, last_contacted_at")
    .eq("user_id", userId)
    .or(`last_contacted_at.lt.${thirtyDaysAgo},last_contacted_at.is.null`)
    .limit(5);

  const clientsNeedingFollowup = (clientRows ?? []).map((c) => {
    const lastContact = c.last_contacted_at
      ? new Date(c.last_contacted_at as string)
      : null;
    const daysSinceContact = lastContact
      ? Math.floor((now.getTime() - lastContact.getTime()) / (1000 * 60 * 60 * 24))
      : null;
    return {
      name: c.name as string,
      days_since_contact: daysSinceContact,
    };
  });

  // ── 3-month average income ────────────────────────────────────────────────
  const threeMonthsAgo = new Date(
    now.getFullYear(),
    now.getMonth() - 3,
    1
  ).toISOString();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const { data: historyRows } = await supabase
    .from("monthly_income")
    .select("paid_sar")
    .gte("month", threeMonthsAgo)
    .lt("month", currentMonthStart);

  let avg3moIncome: number | null = null;
  const historyIncomes = (historyRows ?? [])
    .map((r) => (r.paid_sar as number) ?? 0)
    .filter((v) => v > 0);
  if (historyIncomes.length > 0) {
    avg3moIncome =
      historyIncomes.reduce((s, n) => s + n, 0) / historyIncomes.length;
  }

  // ── Build context and generate plan ──────────────────────────────────────
  const ctx: HadafActionPlanCtx = {
    current_income: currentIncome,
    target_income: targetIncome,
    days_remaining_in_month: daysRemaining,
    active_proposals: activeProposals,
    in_progress_gigs: inProgressGigs,
    clients_needing_followup: clientsNeedingFollowup,
    avg_3mo_income: avg3moIncome,
  };

  const plan = await generateHadafActionPlan(ctx);
  if (!plan) return { ok: false, code: "ai_failed" };

  // ── Store plan in cache ───────────────────────────────────────────────────
  await supabase
    .from("hadaf_status_cache")
    .update({
      ai_action_plan_ar: plan.ar,
      ai_action_plan_en: plan.en,
    })
    .eq("user_id", userId);

  return { ok: true, ar: plan.ar, en: plan.en };
}
