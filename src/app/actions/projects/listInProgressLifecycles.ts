"use server";

/**
 * listInProgressLifecycles — Project Lifecycle Wizard (spec 003), task T005.
 *
 * Dashboard "continue where you left off" set: in-progress projects (active,
 * not yet fully paid) + draft-only proposals that have no project yet (so a
 * half-written brief isn't forgotten). Owner-scoped, bounded, resolved in
 * memory via the pure resolver (no N+1 per-row resolution).
 */

import { createClient } from "@/lib/supabase/server";
import { resolveLifecycle, type LifecycleNextAction, type LifecycleStageKey } from "@/lib/projects/lifecycle";

export type InProgressItem = {
  anchorKind: "project" | "proposal";
  id: string;
  title: string;
  currentStageKey: LifecycleStageKey | null;
  nextAction: LifecycleNextAction;
  href: string;
};

export type ListInProgressResult =
  | { ok: true; items: InProgressItem[] }
  | { ok: false; code: "unauthorized" | "error" };

const DRAFT_STATUSES = ["draft", "final", "sent", "viewed"]; // not declined/expired/accepted-without-project edge

export async function listInProgressLifecycles(limit = 5): Promise<ListInProgressResult> {
  const supabase = await createClient();
  const { data: userResult } = await supabase.auth.getUser();
  if (!userResult.user) return { ok: false, code: "unauthorized" };
  const userId = userResult.user.id;

  // ── Active projects (recent) ──
  const { data: projects } = await supabase
    .from("projects")
    .select("id, title, origin_proposal_id, created_at")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(12);

  const projectIds = (projects ?? []).map((p) => p.id as string);

  // Batch-fetch their gigs + invoices.
  const [{ data: gigs }, { data: invoices }] = await Promise.all([
    projectIds.length
      ? supabase.from("gigs").select("project_id, amount_sar, status").in("project_id", projectIds).eq("user_id", userId)
      : Promise.resolve({ data: [] as { project_id: string; amount_sar: number; status: string }[] }),
    projectIds.length
      ? supabase.from("invoices").select("project_id, status").in("project_id", projectIds).eq("user_id", userId)
      : Promise.resolve({ data: [] as { project_id: string; status: string }[] }),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const gigByProject = new Map<string, any>();
  for (const g of gigs ?? []) if (!gigByProject.has(g.project_id as string)) gigByProject.set(g.project_id as string, g);
  const invoicesByProject = new Map<string, { status: string }[]>();
  for (const inv of invoices ?? []) {
    const arr = invoicesByProject.get(inv.project_id as string) ?? [];
    arr.push({ status: inv.status as string });
    invoicesByProject.set(inv.project_id as string, arr);
  }

  const projectItems: InProgressItem[] = [];
  for (const p of projects ?? []) {
    const pid = p.id as string;
    const gig = gigByProject.get(pid) ?? null;
    const lifecycle = resolveLifecycle({
      proposal: null, // origin status not needed: once a project exists, ① is done/skipped
      hasProject: true,
      projectHasOriginProposal: !!p.origin_proposal_id,
      gig: gig ? { amount_sar: Number(gig.amount_sar), status: gig.status as string } : null,
      invoices: invoicesByProject.get(pid) ?? [],
    });
    if (lifecycle.complete) continue; // only in-progress
    projectItems.push({
      anchorKind: "project",
      id: pid,
      title: (p.title as string) ?? "",
      currentStageKey: lifecycle.currentStageKey,
      nextAction: lifecycle.nextAction,
      href: `/projects/${pid}`,
    });
  }

  // ── Draft-only proposals (no project yet) ──
  const { data: draftProposals } = await supabase
    .from("proposals")
    .select("id, status, project_id, created_at, scope_json")
    .eq("user_id", userId)
    .is("project_id", null)
    .in("status", DRAFT_STATUSES)
    .order("created_at", { ascending: false })
    .limit(12);

  const proposalItems: InProgressItem[] = (draftProposals ?? []).map((pr) => {
    const lifecycle = resolveLifecycle({
      proposal: { status: pr.status as string },
      hasProject: false,
      projectHasOriginProposal: false,
      gig: null,
      invoices: [],
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const scope = pr.scope_json as any;
    const title =
      (Array.isArray(scope?.deliverables) && typeof scope.deliverables[0] === "string"
        ? (scope.deliverables[0] as string)
        : null) ?? "مشروع";
    return {
      anchorKind: "proposal" as const,
      id: pr.id as string,
      title,
      currentStageKey: lifecycle.currentStageKey,
      nextAction: lifecycle.nextAction,
      href: `/proposals/${pr.id as string}`,
    };
  });

  // Merge, recency already roughly ordered per source; cap at limit.
  const items = [...proposalItems, ...projectItems].slice(0, limit);
  return { ok: true, items };
}
