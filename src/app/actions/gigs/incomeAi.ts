"use server";

/**
 * Income AI server actions — spec M3.6.
 * Category suggestion + anomaly detection: FREE (owner-gated only).
 * Income forecasting: PRO.
 *
 * Gating pattern mirrors src/app/actions/clients/clientAi.ts.
 */

import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { suggestCategory } from "@/lib/ai/incomeCategory";
import { explainAnomaly } from "@/lib/ai/incomeAnomaly";
import { forecastIncome, type ForecastCtx } from "@/lib/ai/incomeForecast";
import { isPriceAnomaly } from "@/lib/income/anomaly";
import { isProActive } from "@/lib/billing/tier";

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getAuthContext() {
  const supabase = await createSupabaseClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return null;

  const { data: profile } = await supabase
    .from("users")
    .select("role, pro_until")
    .eq("id", userData.user.id)
    .single();

  return {
    supabase,
    user: userData.user,
    role: (profile?.role ?? "free") as "free" | "pro" | "admin",
    pro_until: (profile?.pro_until as string | null) ?? null,
  };
}

// ─── Return types ─────────────────────────────────────────────────────────────

export type CategorySuggestionResult =
  | {
      ok: true;
      suggestion: {
        category_ar: string;
        category_en: string;
        confidence: number;
      } | null;
    }
  | { ok: false; code: "unauthorized" | "error" };

export type AnomalyCheckResult =
  | { ok: true; anomaly: false }
  | { ok: true; anomaly: true; reason?: string }
  | { ok: false; code: "unauthorized" | "not_found" | "error" };

export type ForecastResult =
  | {
      ok: true;
      current_month_projection: number;
      next_month_projection: number;
      confidence_low: number;
      confidence_high: number;
      narrative_ar: string;
      narrative_en: string;
      factors_ar: string[];
      factors_en: string[];
    }
  | { ok: false; code: "unauthorized" | "upgrade" | "error" };

// ─── suggestGigCategoryAction ─────────────────────────────────────────────────

/**
 * Suggests a billing category for a gig title.
 * Free — available to all authenticated users.
 */
export async function suggestGigCategoryAction(input: {
  title: string;
}): Promise<CategorySuggestionResult> {
  const ctx = await getAuthContext();
  if (!ctx) return { ok: false, code: "unauthorized" };

  const { supabase, user } = ctx;
  const { title } = input;

  if (!title?.trim()) return { ok: true, suggestion: null };

  // Load user's specialties (best-effort — field may not exist on all rows)
  let specialties: string[] = [];
  try {
    const { data: profile } = await supabase
      .from("users")
      .select("specialties")
      .eq("id", user.id)
      .single();
    if (profile && Array.isArray((profile as Record<string, unknown>).specialties)) {
      specialties = (profile as { specialties: string[] }).specialties;
    }
  } catch {
    // column may not exist yet — ignore
  }

  // Load distinct past categories used by this user
  const { data: categoryRows } = await supabase
    .from("gigs")
    .select("category")
    .eq("user_id", user.id)
    .not("category", "is", null);

  const pastCategories = [
    ...new Set(
      (categoryRows ?? [])
        .map((r) => r.category as string | null)
        .filter((c): c is string => !!c)
    ),
  ].slice(0, 20);

  try {
    const suggestion = await suggestCategory({ title, specialties, pastCategories });
    return { ok: true, suggestion };
  } catch (err) {
    console.error("[suggestGigCategoryAction] failed", err);
    return { ok: false, code: "error" };
  }
}

// ─── checkGigAnomalyAction ────────────────────────────────────────────────────

/**
 * Checks a gig for a price anomaly against the user's same-category history.
 * Requires ≥ 3 prior gigs in the same category; otherwise returns anomaly:false.
 * Writes ai_anomaly_flag + ai_anomaly_reason back to the gig row.
 * Free — available to all authenticated users.
 */
export async function checkGigAnomalyAction(input: {
  gig_id: string;
}): Promise<AnomalyCheckResult> {
  const ctx = await getAuthContext();
  if (!ctx) return { ok: false, code: "unauthorized" };

  const { supabase, user } = ctx;
  const { gig_id } = input;

  // Load the gig (owner check)
  const { data: gig, error: gigErr } = await supabase
    .from("gigs")
    .select("id, title, amount_sar, category")
    .eq("id", gig_id)
    .eq("user_id", user.id)
    .single();

  if (gigErr || !gig) return { ok: false, code: "not_found" };

  const category = gig.category as string | null;

  // Need a category to compare against
  if (!category) return { ok: true, anomaly: false };

  // Load all other gigs in the same category to compute stats
  const { data: siblingRows } = await supabase
    .from("gigs")
    .select("amount_sar")
    .eq("user_id", user.id)
    .eq("category", category)
    .neq("id", gig_id);

  const siblings = (siblingRows ?? []).map((r) => r.amount_sar as number);

  // Minimum-sample check: need at least 3 prior same-category gigs
  if (siblings.length < 3) return { ok: true, anomaly: false };

  const avg = siblings.reduce((s, n) => s + n, 0) / siblings.length;
  const min = Math.min(...siblings);
  const max = Math.max(...siblings);
  const amount = gig.amount_sar as number;

  const anomalous = isPriceAnomaly(amount, avg);

  if (!anomalous) {
    // Clear any previous flag
    await supabase
      .from("gigs")
      .update({
        ai_anomaly_flag: false,
        ai_anomaly_reason: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", gig_id)
      .eq("user_id", user.id);

    return { ok: true, anomaly: false };
  }

  // Anomaly — fetch explanation from AI
  const explanation = await explainAnomaly({
    category,
    avg,
    min,
    max,
    amount,
    title: gig.title as string,
  });

  const reason = explanation?.reason_ar ?? null;

  await supabase
    .from("gigs")
    .update({
      ai_anomaly_flag: true,
      ai_anomaly_reason: reason,
      updated_at: new Date().toISOString(),
    })
    .eq("id", gig_id)
    .eq("user_id", user.id);

  revalidatePath("/[locale]/income", "page");
  revalidatePath(`/[locale]/income/${gig_id}`, "page");

  return { ok: true, anomaly: true, reason: reason ?? undefined };
}

// ─── forecastIncomeAction ─────────────────────────────────────────────────────

/**
 * Generates an income projection for the current and next month.
 * PRO only. Caches in income_projections for 7 days.
 */
export async function forecastIncomeAction(): Promise<ForecastResult> {
  const ctx = await getAuthContext();
  if (!ctx) return { ok: false, code: "unauthorized" };
  if (!isProActive(ctx.role, ctx.pro_until)) return { ok: false, code: "upgrade" };

  const { supabase, user } = ctx;
  const now = new Date();

  // Check for a fresh cached projection (valid_until > now)
  const { data: cached } = await supabase
    .from("income_projections")
    .select(
      "current_month_projection, next_month_projection, confidence_low, confidence_high, projection_basis, generated_at, valid_until"
    )
    .eq("user_id", user.id)
    .maybeSingle();

  if (cached?.valid_until && new Date(cached.valid_until as string) > now) {
    const basis = (cached.projection_basis ?? {}) as Record<string, unknown>;
    return {
      ok: true,
      current_month_projection: cached.current_month_projection as number,
      next_month_projection: cached.next_month_projection as number,
      confidence_low: cached.confidence_low as number,
      confidence_high: cached.confidence_high as number,
      narrative_ar: (basis.narrative_ar as string) ?? "",
      narrative_en: (basis.narrative_en as string) ?? "",
      factors_ar: (basis.factors_ar as string[]) ?? [],
      factors_en: (basis.factors_en as string[]) ?? [],
    };
  }

  // ── Gather pipeline data ──────────────────────────────────────────────────

  // Current month bounds (Riyadh = UTC+3, approximate with UTC for server)
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const daysInMonth = nextMonthStart.getDate() === 1
    ? new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    : 30;
  const daysRemaining = Math.max(
    0,
    new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate()
  );

  // Current month confirmed income (monthly_income view)
  const { data: monthlyRows } = await supabase
    .from("monthly_income")
    .select("total_sar, gig_count")
    .gte("month", currentMonthStart.toISOString())
    .lt("month", nextMonthStart.toISOString())
    .limit(1);

  const currentMonthTotal = (monthlyRows?.[0]?.total_sar as number) ?? 0;
  const currentGigCount = (monthlyRows?.[0]?.gig_count as number) ?? 0;

  // In-progress gigs
  const { data: inProgressRows } = await supabase
    .from("gigs")
    .select("title, amount_sar, delivery_date")
    .eq("user_id", user.id)
    .in("status", ["in_progress", "deposit_paid", "delivered"]);

  const inProgress = (inProgressRows ?? []).map((g) => ({
    title: g.title as string,
    amount: g.amount_sar as number,
    expected: g.delivery_date as string | null,
  }));

  // Active proposals (sent or viewed)
  const { data: proposalRows } = await supabase
    .from("proposals")
    .select("client_name, price_anchor, status, created_at")
    .eq("user_id", user.id)
    .in("status", ["sent", "viewed"]);

  const activeProposals = (proposalRows ?? []).map((p) => {
    const sentDate = p.created_at ? new Date(p.created_at as string) : now;
    const daysSinceSent = Math.floor(
      (now.getTime() - sentDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    return {
      title: p.client_name as string | null,
      priceAnchor: p.price_anchor as number | null,
      daysSinceSent,
    };
  });

  // Last 6 months history
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
  const { data: historyRows } = await supabase
    .from("monthly_income")
    .select("month, total_sar")
    .gte("month", sixMonthsAgo.toISOString())
    .lt("month", currentMonthStart.toISOString())
    .order("month", { ascending: true });

  const history = (historyRows ?? []).map((r) => ({
    month: r.month as string,
    total: (r.total_sar as number) ?? 0,
  }));

  const forecastCtx: ForecastCtx = {
    currentMonthTotal,
    currentGigCount,
    inProgress,
    activeProposals,
    history,
    daysRemaining,
    seasonalFactor: 1.0,
  };

  const forecast = await forecastIncome(forecastCtx);
  if (!forecast) return { ok: false, code: "error" };

  // Midpoints for stored projections
  const currentMid = Math.round(
    (forecast.current_month_low + forecast.current_month_high) / 2
  );
  const nextMid = Math.round(
    (forecast.next_month_low + forecast.next_month_high) / 2
  );

  const validUntil = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const projectionBasis = {
    factors_ar: forecast.factors_ar,
    factors_en: forecast.factors_en,
    narrative_ar: forecast.narrative_ar,
    narrative_en: forecast.narrative_en,
    current_month_low: forecast.current_month_low,
    current_month_high: forecast.current_month_high,
    next_month_low: forecast.next_month_low,
    next_month_high: forecast.next_month_high,
    confidence: forecast.confidence,
  };

  // UPSERT into income_projections
  await supabase.from("income_projections").upsert(
    {
      user_id: user.id,
      current_month_projection: currentMid,
      next_month_projection: nextMid,
      confidence_low: forecast.current_month_low,
      confidence_high: forecast.current_month_high,
      projection_basis: projectionBasis,
      generated_at: now.toISOString(),
      valid_until: validUntil,
    },
    { onConflict: "user_id" }
  );

  revalidatePath("/[locale]/income", "page");

  return {
    ok: true,
    current_month_projection: currentMid,
    next_month_projection: nextMid,
    confidence_low: forecast.current_month_low,
    confidence_high: forecast.current_month_high,
    narrative_ar: forecast.narrative_ar,
    narrative_en: forecast.narrative_en,
    factors_ar: forecast.factors_ar,
    factors_en: forecast.factors_en,
  };
}
