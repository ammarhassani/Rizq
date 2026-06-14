/**
 * Income forecasting — spec M3.6-C/D.
 * Generates current-month and next-month income projections from pipeline context.
 * Server-only (uses AI SDK).
 */
import "server-only";
import { generateObject } from "ai";
import { z } from "zod";
import { deepseek, REASONING_MODEL } from "@/lib/ai/client";

export type ForecastCtx = {
  currentMonthTotal: number;           // sum of all gigs delivered/paid this month so far
  currentGigCount: number;             // number of gigs this month so far
  inProgress: Array<{                  // in-progress gigs likely to close this month
    title: string;
    amount: number;
    expected: string | null;           // expected delivery date ISO
  }>;
  activeProposals: Array<{             // proposals sent/viewed not yet accepted
    title: string | null;
    priceAnchor: number | null;
    daysSinceSent: number;
  }>;
  history: Array<{                     // last 6 months of monthly totals
    month: string;   // ISO date of month start
    total: number;
  }>;
  daysRemaining: number;               // days left in the Riyadh calendar month
  seasonalFactor: number;              // 1.0 placeholder; future: adjust for Ramadan/summer
};

export type ForecastResult = {
  current_month_low: number;
  current_month_high: number;
  next_month_low: number;
  next_month_high: number;
  confidence: number;           // 0..1 overall confidence in the projection
  factors_ar: string[];         // 2–4 short factor bullets in Arabic
  factors_en: string[];         // 2–4 short factor bullets in English
  narrative_ar: string;         // 2–3 sentence summary in Arabic
  narrative_en: string;         // 2–3 sentence summary in English
};

const ForecastSchema = z.object({
  current_month_low: z.number().nonnegative(),
  current_month_high: z.number().nonnegative(),
  next_month_low: z.number().nonnegative(),
  next_month_high: z.number().nonnegative(),
  confidence: z.number().min(0).max(1),
  factors_ar: z.array(z.string()).min(1).max(6),
  factors_en: z.array(z.string()).min(1).max(6),
  narrative_ar: z.string().min(1),
  narrative_en: z.string().min(1),
});

/**
 * Returns an income forecast from the given pipeline context, or null on failure.
 * The narrative is prefixed with "تحليل رِزق —" / "Rizq Insight —".
 */
export async function forecastIncome(ctx: ForecastCtx): Promise<ForecastResult | null> {
  const prompt = buildPrompt(ctx);
  try {
    const result = await generateObject({
      model: deepseek(REASONING_MODEL),
      schema: ForecastSchema,
      prompt,
      abortSignal: AbortSignal.timeout(10_000),
    });
    const obj = result.object;
    return {
      ...obj,
      narrative_ar: `تحليل رِزق — ${obj.narrative_ar}`,
      narrative_en: `Rizq Insight — ${obj.narrative_en}`,
    };
  } catch (err) {
    console.error("[forecastIncome] failed", err);
    return null;
  }
}

function buildPrompt(ctx: ForecastCtx): string {
  const {
    currentMonthTotal,
    currentGigCount,
    inProgress,
    activeProposals,
    history,
    daysRemaining,
    seasonalFactor,
  } = ctx;

  const historyText = history.length
    ? history
        .map((h) => `  ${h.month.slice(0, 7)}: ${h.total} SAR`)
        .join("\n")
    : "  No history available.";

  const inProgressText = inProgress.length
    ? inProgress
        .map(
          (g) =>
            `  - "${g.title}": ${g.amount} SAR${g.expected ? ` (expected ${g.expected})` : ""}`
        )
        .join("\n")
    : "  None";

  const proposalsText = activeProposals.length
    ? activeProposals
        .map(
          (p) =>
            `  - "${p.title ?? "Untitled"}": ${p.priceAnchor != null ? `${p.priceAnchor} SAR` : "price unknown"} (sent ${p.daysSinceSent}d ago)`
        )
        .join("\n")
    : "  None";

  return `You are an income forecasting assistant for Saudi freelancers (Rizq / رِزق).
Forecast the freelancer's income for the current month (remaining ${daysRemaining} days)
and next month, using the pipeline data below.

CURRENT MONTH SO FAR:
  Confirmed income: ${currentMonthTotal} SAR from ${currentGigCount} gig(s)

IN-PROGRESS GIGS (likely to close this month):
${inProgressText}

ACTIVE PROPOSALS (may convert):
${proposalsText}

MONTHLY HISTORY (last 6 months):
${historyText}

SEASONAL FACTOR: ${seasonalFactor} (1.0 = no seasonal adjustment)

RULES:
- current_month_low: conservative floor (minimum likely outcome)
- current_month_high: optimistic ceiling (best-case, pipeline fully converts)
- next_month_low / next_month_high: same concept for next month (use history trend)
- confidence: 0..1 — lower if history is sparse or pipeline is uncertain
- factors_ar/factors_en: 2–4 SHORT bullet phrases explaining key drivers (e.g. "3 مشاريع جارية", "عرض 5000 ريال قيد الانتظار")
- narrative_ar / narrative_en: 2–3 sentences, plain language, polite Saudi advisor tone
- All SAR amounts must be >= 0 and realistic
- NEVER invent data not given above`;
}
