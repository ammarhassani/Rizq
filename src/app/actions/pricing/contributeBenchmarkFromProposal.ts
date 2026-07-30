"use server";

/**
 * Benchmark flywheel — the proposal half.
 *
 * Retiring the unverifiable seed left 221 of 700 cells with nothing to show. This is what
 * refills them, and it refills them with the only evidence Rizq can produce that nobody else
 * has: a Saudi freelancer's own price for a Saudi brief.
 *
 * A finalized proposal is an ASK, not a clearing price. Nobody has agreed to it and nobody has
 * paid it, so it is weaker evidence than a paid invoice and is recorded as such — confidence
 * 0.40 against the paid path's 0.70. Weighting them equally would let a freelancer's optimism
 * move the market figure that other freelancers then quote from.
 *
 * Every guard lives inside the `contribute_benchmark` RPC and applies here unchanged: opt-in
 * consent (PDPL), the test-account firewall, and k-anonymity at read so no single person's
 * price can ever be read back out of a band. Best-effort throughout — a benchmark contribution
 * must never be the reason a freelancer cannot finalize their own proposal.
 */

import { createClient } from "@/lib/supabase/server";
import {
  PROPOSAL_CONTRIBUTION_CONFIDENCE,
  projectSizeFromDeliverables,
} from "@/lib/pricing/contribution";

export async function contributeBenchmarkFromProposal(
  proposalId: string
): Promise<{ contributed: boolean }> {
  try {
    const supabase = await createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return { contributed: false };

    const { data: proposal } = await supabase
      .from("proposals")
      .select("specialty_id, city_id, experience_tier_id, price_anchor, scope_json")
      .eq("id", proposalId)
      .eq("user_id", userData.user.id)
      .single();

    // Without all three keys the row cannot be placed in a cell, and a benchmark row that
    // does not know which market it describes is worse than no row.
    if (!proposal?.specialty_id || !proposal?.city_id || !proposal?.experience_tier_id) {
      return { contributed: false };
    }

    const price = Number(proposal.price_anchor);
    if (!(price > 0)) return { contributed: false };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const deliverableCount = ((proposal.scope_json as any)?.deliverable_count as number | null) ?? null;

    const { data: id } = await supabase.rpc("contribute_benchmark", {
      p_specialty_id: proposal.specialty_id,
      p_city_id: proposal.city_id,
      p_experience_tier_id: proposal.experience_tier_id,
      p_price_sar: price,
      p_project_size: projectSizeFromDeliverables(deliverableCount),
      // Distinguishable from the paid path (`rizq:project:`) so the two verification tiers
      // stay separable in the corpus and can be re-weighted later without guesswork.
      p_source_ref: `rizq:proposal:${proposalId}`,
      p_confidence: PROPOSAL_CONTRIBUTION_CONFIDENCE,
    });
    return { contributed: !!id };
  } catch {
    return { contributed: false }; // never block the freelancer's own flow
  }
}
