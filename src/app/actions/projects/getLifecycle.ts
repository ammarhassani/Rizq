"use server";

/**
 * getLifecycle — Project Lifecycle Wizard (spec 003), task T004.
 *
 * Owner-scoped: resolves the lifecycle for a project (preferred) or a draft
 * proposal that has no project yet. Reads existing rows and runs the pure
 * resolver — no stored stage. RLS guarantees isolation.
 */

import { createClient } from "@/lib/supabase/server";
import { resolveLifecycle, type Lifecycle } from "@/lib/projects/lifecycle";

export type GetLifecycleResult =
  | {
      ok: true;
      lifecycle: Lifecycle;
      project_id: string | null;
      proposal_id: string | null;
      gig_id: string | null;
    }
  | { ok: false; code: "unauthorized" | "not_found" | "error" };

type Args = { project_id?: string; proposal_id?: string };

export async function getLifecycle(args: Args): Promise<GetLifecycleResult> {
  const supabase = await createClient();
  const { data: userResult } = await supabase.auth.getUser();
  if (!userResult.user) return { ok: false, code: "unauthorized" };
  const userId = userResult.user.id;

  // ── Project path ──
  if (args.project_id) {
    const { data: project, error } = await supabase
      .from("projects")
      .select("id, origin_proposal_id")
      .eq("id", args.project_id)
      .eq("user_id", userId)
      .single();
    if (error || !project) return { ok: false, code: "not_found" };

    const originProposalId = (project.origin_proposal_id as string | null) ?? null;

    const [{ data: gigs }, { data: invoices }, originProposal] = await Promise.all([
      supabase
        .from("gigs")
        .select("id, amount_sar, status")
        .eq("project_id", project.id)
        .eq("user_id", userId)
        .order("created_at", { ascending: true })
        .limit(1),
      supabase
        .from("invoices")
        .select("status")
        .eq("project_id", project.id)
        .eq("user_id", userId),
      originProposalId
        ? supabase
            .from("proposals")
            .select("status")
            .eq("id", originProposalId)
            .eq("user_id", userId)
            .single()
        : Promise.resolve({ data: null }),
    ]);

    const gig = gigs?.[0] ?? null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const proposalStatus = (originProposal as any)?.data?.status as string | undefined;

    const lifecycle = resolveLifecycle({
      proposal: proposalStatus ? { status: proposalStatus } : null,
      hasProject: true,
      projectHasOriginProposal: !!originProposalId,
      gig: gig ? { amount_sar: Number(gig.amount_sar), status: gig.status as string } : null,
      invoices: (invoices ?? []).map((i) => ({ status: i.status as string })),
    });

    return {
      ok: true,
      lifecycle,
      project_id: project.id as string,
      proposal_id: originProposalId,
      gig_id: (gig?.id as string | undefined) ?? null,
    };
  }

  // ── Draft-proposal path (no project yet) ──
  if (args.proposal_id) {
    const { data: proposal, error } = await supabase
      .from("proposals")
      .select("id, status, project_id")
      .eq("id", args.proposal_id)
      .eq("user_id", userId)
      .single();
    if (error || !proposal) return { ok: false, code: "not_found" };

    const lifecycle = resolveLifecycle({
      proposal: { status: proposal.status as string },
      hasProject: false,
      projectHasOriginProposal: false,
      gig: null,
      invoices: [],
    });

    return {
      ok: true,
      lifecycle,
      project_id: (proposal.project_id as string | null) ?? null,
      proposal_id: proposal.id as string,
      gig_id: null,
    };
  }

  return { ok: false, code: "not_found" };
}
