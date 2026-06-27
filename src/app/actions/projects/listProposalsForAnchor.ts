"use server";

/**
 * listProposalsForAnchor (feature 005, US4).
 *
 * The "use an existing proposal" picker: the user's UNANCHORED proposals
 * (`project_id IS NULL`) so a project can't double-anchor, ordered accepted ›
 * sent › viewed › draft then most recent. Owner-scoped (RLS).
 */

import { createClient } from "@/lib/supabase/server";
import { sortAnchorProposals } from "@/lib/projects/anchorSort";

export type AnchorProposal = {
  id: string;
  title: string;
  clientName: string | null;
  priceAnchor: number | null;
  status: string;
  createdAt: string;
};

export type ListProposalsForAnchorResult =
  | { ok: true; items: AnchorProposal[] }
  | { ok: false; code: "unauthorized" | "error" };

/** Title = first deliverable in scope_json, else the brief, else a generic label. */
function deriveTitle(scopeJson: unknown, clientName: string | null): string {
  const scope = (scopeJson ?? null) as Record<string, unknown> | null;
  const deliverables = scope?.["deliverables"];
  if (Array.isArray(deliverables) && deliverables.length > 0) {
    const first = deliverables[0];
    if (typeof first === "string" && first.trim()) return first.trim();
    if (first && typeof first === "object" && typeof (first as Record<string, unknown>).title === "string") {
      return ((first as Record<string, unknown>).title as string).trim();
    }
  }
  return clientName?.trim() || "عرض";
}

export async function listProposalsForAnchor(): Promise<ListProposalsForAnchorResult> {
  const supabase = await createClient();
  const { data: userResult } = await supabase.auth.getUser();
  if (!userResult.user) return { ok: false, code: "unauthorized" };

  const { data, error } = await supabase
    .from("proposals")
    .select("id, status, created_at, client_name, price_anchor, scope_json, clients(name)")
    .eq("user_id", userResult.user.id)
    .is("project_id", null)
    .limit(200);

  if (error) return { ok: false, code: "error" };

  const items: AnchorProposal[] = (data ?? []).map((p) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const clientName = ((p.clients as any)?.name as string | null) ?? (p.client_name as string | null) ?? null;
    return {
      id: p.id as string,
      title: deriveTitle(p.scope_json, clientName),
      clientName,
      priceAnchor: p.price_anchor != null ? Number(p.price_anchor) : null,
      status: (p.status as string) ?? "draft",
      createdAt: (p.created_at as string) ?? "",
    };
  });

  return { ok: true, items: sortAnchorProposals(items) };
}
