"use server";

/**
 * Benchmark flywheel contribution (data-strategy Tier 3).
 *
 * When a project's invoice is PAID (ground truth), contribute its price as a
 * `submitted` benchmark — keyed by the origin proposal's specialty × city × tier
 * × scope size. Consent is enforced inside the `contribute_benchmark` RPC (opt-in,
 * PDPL), which also records source_user_id for k-anonymity. Best-effort: never
 * throws, never blocks the invoice flow. Anonymous (no client identity stored).
 */

import { createClient } from "@/lib/supabase/server";
import { projectSizeFromDeliverables } from "@/lib/pricing/contribution";

export async function contributeBenchmarkFromProject(projectId: string): Promise<{ contributed: boolean }> {
  try {
    const supabase = await createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return { contributed: false };

    const { data: project } = await supabase
      .from("projects")
      .select("id, origin_proposal_id")
      .eq("id", projectId)
      .eq("user_id", userData.user.id)
      .single();
    const originId = (project?.origin_proposal_id as string | null) ?? null;
    if (!originId) return { contributed: false }; // no anchor proposal → can't key the cell

    const { data: proposal } = await supabase
      .from("proposals")
      .select("specialty_id, city_id, experience_tier_id, scope_json")
      .eq("id", originId)
      .eq("user_id", userData.user.id)
      .single();
    if (!proposal?.specialty_id || !proposal?.city_id || !proposal?.experience_tier_id) {
      return { contributed: false };
    }

    const { data: gig } = await supabase
      .from("gigs")
      .select("amount_sar")
      .eq("project_id", projectId)
      .eq("user_id", userData.user.id)
      .limit(1)
      .maybeSingle();
    const price = gig ? Number(gig.amount_sar) : 0;
    if (!(price > 0)) return { contributed: false };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const deliverableCount = ((proposal.scope_json as any)?.deliverable_count as number | null) ?? null;

    const { data: id } = await supabase.rpc("contribute_benchmark", {
      p_specialty_id: proposal.specialty_id,
      p_city_id: proposal.city_id,
      p_experience_tier_id: proposal.experience_tier_id,
      p_price_sar: price,
      p_project_size: projectSizeFromDeliverables(deliverableCount),
      p_source_ref: `rizq:project:${projectId}`,
      p_confidence: 0.7,
    });
    return { contributed: !!id };
  } catch {
    return { contributed: false }; // best-effort — never block the money flow
  }
}
