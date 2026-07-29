"use server";

/**
 * The opt-in that makes the benchmark flywheel real.
 *
 * Every piece of the flywheel has existed for weeks — the `contribute_benchmark` RPC, the paid
 * invoice trigger, the proposal trigger, k-anonymity, the test-account firewall — and none of
 * it has ever fired, because `users.contribute_benchmarks` defaults to false and nothing in
 * the product could set it. 0 of 53 accounts had ever consented. This is that switch.
 *
 * PDPL: opt-in, never opt-out. Off is the default and stays the default; a freelancer who
 * never opens Settings never contributes. Revocable at any time, and revoking stops future
 * contributions — it does not retract rows already anonymised into a band, which the copy
 * says plainly rather than implying an undo that cannot exist.
 */

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type BenchmarkConsentResult =
  | { ok: true; enabled: boolean }
  | { ok: false; code: "unauthorized" | "error" };

export async function setBenchmarkConsent(
  enabled: unknown
): Promise<BenchmarkConsentResult> {
  if (typeof enabled !== "boolean") return { ok: false, code: "error" };

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, code: "unauthorized" };

  const { error } = await supabase
    .from("users")
    .update({ contribute_benchmarks: enabled })
    .eq("id", userData.user.id);

  if (error) {
    console.error("[setBenchmarkConsent] update failed", {
      code: error.code,
      message: error.message,
    });
    return { ok: false, code: "error" };
  }

  revalidatePath("/[locale]/settings", "page");
  return { ok: true, enabled };
}
