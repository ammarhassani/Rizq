"use server";

/**
 * computeRateAction — spec M10.
 * Auth-gated. Resolves market data via resolvePrice then runs the pure
 * calculateRate function. Returns both the rate output and the market band
 * (or null if insufficient data).
 */

import { createClient } from "@/lib/supabase/server";
import { resolvePrice } from "@/lib/pricing/resolve";
import { calculateRate } from "@/lib/rate/calculate";
import type { RateCalculatorInput, RateCalculatorOutput, MarketBand } from "@/lib/rate/calculate";

export type ComputeRateInput = RateCalculatorInput & {
  specialty_slug: string;
  city_slug: string;
  experience_tier_slug: string;
};

export type ComputeRateResult =
  | {
      ok: true;
      output: RateCalculatorOutput;
      market: MarketBand | null;
      market_unavailable: boolean;
    }
  | { ok: false; code: "unauthorized" | "invalid_input" | "error" };

export async function computeRateAction(
  input: ComputeRateInput
): Promise<ComputeRateResult> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, code: "unauthorized" };

  // Validate numeric inputs
  if (
    !Number.isFinite(input.monthly_target_sar) ||
    input.monthly_target_sar < 0 ||
    !Number.isFinite(input.working_days_per_month) ||
    input.working_days_per_month < 0 ||
    !Number.isFinite(input.hours_per_day) ||
    input.hours_per_day < 0 ||
    !Number.isFinite(input.projects_per_month_target) ||
    input.projects_per_month_target < 0
  ) {
    return { ok: false, code: "invalid_input" };
  }

  // Resolve market band
  let market: MarketBand | null = null;
  let market_unavailable = false;

  try {
    const resolved = await resolvePrice({
      specialty_slug: input.specialty_slug,
      city_slug: input.city_slug,
      experience_tier_slug: input.experience_tier_slug,
    });

    if (resolved.status === "ok") {
      market = {
        min: resolved.min,
        anchor: resolved.anchor,
        max: resolved.max,
        sample_size: resolved.sample_size,
      };
    } else {
      market_unavailable = true;
    }
  } catch (err) {
    console.error("[computeRateAction] resolvePrice failed", err);
    market_unavailable = true;
  }

  const rateInput: RateCalculatorInput = {
    monthly_target_sar: input.monthly_target_sar,
    working_days_per_month: input.working_days_per_month,
    hours_per_day: input.hours_per_day,
    projects_per_month_target: input.projects_per_month_target,
  };

  const output = calculateRate(rateInput, market);

  return { ok: true, output, market, market_unavailable };
}
