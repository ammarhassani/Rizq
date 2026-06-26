"use server";

/**
 * listProjects — the Projects home (spec 003/004). Returns the user's active
 * projects with their money + resolved lifecycle stage, so the index can show a
 * clean "resume where you left off" list. Batched (no N+1).
 */

import { createClient } from "@/lib/supabase/server";
import { resolveLifecycle, type Lifecycle } from "@/lib/projects/lifecycle";

export type ProjectListItem = {
  id: string;
  title: string;
  clientName: string | null;
  amountSar: number | null;
  status: string;
  lifecycle: Lifecycle;
};

export type ListProjectsResult =
  | { ok: true; items: ProjectListItem[] }
  | { ok: false; code: "unauthorized" | "error" };

export async function listProjects(): Promise<ListProjectsResult> {
  const supabase = await createClient();
  const { data: userResult } = await supabase.auth.getUser();
  if (!userResult.user) return { ok: false, code: "unauthorized" };
  const userId = userResult.user.id;

  const { data: projects } = await supabase
    .from("projects")
    .select("id, title, status, client_id, origin_proposal_id, created_at, clients(name)")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(100);

  const list = projects ?? [];
  if (list.length === 0) return { ok: true, items: [] };

  const ids = list.map((p) => p.id as string);
  const originIds = list.map((p) => p.origin_proposal_id as string | null).filter(Boolean) as string[];

  const [{ data: gigs }, { data: invoices }, { data: proposals }] = await Promise.all([
    supabase.from("gigs").select("project_id, amount_sar, status").in("project_id", ids).eq("user_id", userId),
    supabase.from("invoices").select("project_id, status").in("project_id", ids).eq("user_id", userId),
    originIds.length
      ? supabase.from("proposals").select("id, status").in("id", originIds).eq("user_id", userId)
      : Promise.resolve({ data: [] as { id: string; status: string }[] }),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const gigByProject = new Map<string, any>();
  for (const g of gigs ?? []) if (!gigByProject.has(g.project_id as string)) gigByProject.set(g.project_id as string, g);
  const invByProject = new Map<string, { status: string }[]>();
  for (const inv of invoices ?? []) {
    const arr = invByProject.get(inv.project_id as string) ?? [];
    arr.push({ status: inv.status as string });
    invByProject.set(inv.project_id as string, arr);
  }
  const proposalStatus = new Map<string, string>();
  for (const pr of proposals ?? []) proposalStatus.set(pr.id as string, pr.status as string);

  const items: ProjectListItem[] = list.map((p) => {
    const pid = p.id as string;
    const gig = gigByProject.get(pid) ?? null;
    const originId = (p.origin_proposal_id as string | null) ?? null;
    const lifecycle = resolveLifecycle({
      proposal: originId && proposalStatus.has(originId) ? { status: proposalStatus.get(originId)! } : null,
      hasProject: true,
      projectHasOriginProposal: !!originId,
      gig: gig ? { amount_sar: Number(gig.amount_sar), status: gig.status as string } : null,
      invoices: invByProject.get(pid) ?? [],
    });
    return {
      id: pid,
      title: (p.title as string) ?? "",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      clientName: ((p.clients as any)?.name as string | null) ?? null,
      amountSar: gig ? Number(gig.amount_sar) : null,
      status: (p.status as string) ?? "active",
      lifecycle,
    };
  });

  return { ok: true, items };
}
