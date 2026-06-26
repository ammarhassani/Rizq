"use server";

/**
 * getProject — Feature 002 (Project hub), task T014.
 *
 * Owner-scoped loader for the project detail page. Returns the project, its 1:1
 * money child gig, the origin proposal, all invoices billed against the project
 * (by project_id, with a gig_id fallback for not-yet-backfilled rows), its
 * integrations, and its timeline events. RLS guarantees cross-user isolation.
 */

import { createClient } from "@/lib/supabase/server";

export type ProjectBundle = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  project: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  gig: any | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  originProposal: any | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  invoices: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  integrations: any[];
  clientName: string | null;
};

export type GetProjectResult =
  | { ok: true; bundle: ProjectBundle }
  | { ok: false; code: "unauthorized" | "not_found" | "error" };

export async function getProject(projectId: string): Promise<GetProjectResult> {
  const supabase = await createClient();

  const { data: userResult } = await supabase.auth.getUser();
  if (!userResult.user) return { ok: false, code: "unauthorized" };
  const userId = userResult.user.id;

  const { data: project, error: projErr } = await supabase
    .from("projects")
    .select("*, clients(id, name)")
    .eq("id", projectId)
    .eq("user_id", userId)
    .single();

  if (projErr || !project) return { ok: false, code: "not_found" };

  // Money child (1:1 today). on delete cascade keeps at most one live.
  const { data: gigs } = await supabase
    .from("gigs")
    .select("*")
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1);
  const gig = gigs?.[0] ?? null;

  // Origin proposal.
  let originProposal = null;
  const originProposalId = (project.origin_proposal_id as string | null) ?? null;
  if (originProposalId) {
    const { data: prop } = await supabase
      .from("proposals")
      .select("id, status, price_anchor, created_at")
      .eq("id", originProposalId)
      .eq("user_id", userId)
      .single();
    originProposal = prop ?? null;
  }

  // Invoices billed against this project (project_id, fallback gig_id).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let invoices: any[] = [];
  const { data: byProject } = await supabase
    .from("invoices")
    .select("id, invoice_number, status, total_sar, due_date, created_at")
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  invoices = byProject ?? [];
  if (invoices.length === 0 && gig?.id) {
    const { data: byGig } = await supabase
      .from("invoices")
      .select("id, invoice_number, status, total_sar, due_date, created_at")
      .eq("gig_id", gig.id)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    invoices = byGig ?? [];
  }

  // Integrations (stub registry).
  const { data: integrations } = await supabase
    .from("project_integrations")
    .select("id, provider, external_url, display_label, status, created_at")
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const clientName = (project.clients as any)?.name ?? null;

  return {
    ok: true,
    bundle: {
      project,
      gig,
      originProposal,
      invoices,
      integrations: integrations ?? [],
      clientName,
    },
  };
}
