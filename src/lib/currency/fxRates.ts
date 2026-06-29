import "server-only";

/**
 * FX rate service (feature 007). Returns a cited SAR-per-unit for a currency, or
 * null (caller degrades to SAR-only — never fabricate). USD/AED use the fixed
 * SAMA peg chain. EUR/GBP come from the daily `fx_rates` cache (filled from a
 * public reference feed). Everything is guarded so it degrades gracefully — incl.
 * before the `fx_rates` migration is applied (table-missing → null, not a throw).
 */

import { createClient } from "@/lib/supabase/server";
import { SAR_PER_USD, SAR_PER_AED, type CurrencyCode } from "./currencies";
import type { FxRate } from "./convert";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function getSarRate(quote: CurrencyCode): Promise<FxRate | null> {
  if (quote === "SAR") return { quote, sarPerUnit: 1, asOf: today(), source: "base" };
  if (quote === "USD") return { quote, sarPerUnit: SAR_PER_USD, asOf: today(), source: "SAMA peg" };
  if (quote === "AED") return { quote, sarPerUnit: SAR_PER_AED, asOf: today(), source: "USD/AED peg" };

  // Floating (EUR/GBP): read today's cached rate. Guarded — if the table doesn't
  // exist yet (migration not applied) or the read fails, degrade to null.
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("fx_rates")
      .select("quote, sar_per_unit, as_of, source")
      .eq("quote", quote)
      .order("as_of", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data && typeof data.sar_per_unit === "number" && data.sar_per_unit > 0) {
      return {
        quote,
        sarPerUnit: Number(data.sar_per_unit),
        asOf: String(data.as_of),
        source: String(data.source),
      };
    }
  } catch {
    /* table missing / read failed → degrade */
  }
  return null;
}
