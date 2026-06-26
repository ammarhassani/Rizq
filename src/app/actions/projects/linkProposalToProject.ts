"use server";

/**
 * linkProposalToProject — Project Lifecycle Wizard (spec 003).
 * Backfills a "skipped" proposal onto an existing project: marks the proposal
 * as the project's origin and sets the project's origin_proposal_id (only if it
 * doesn't already have one). Used when the freelancer goes back to do the
 * proposal step they skipped. Owner-scoped, best-effort, idempotent.
 */

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

const InputSchema = z.object({
  proposal_id: z.string().uuid(),
  project_id: z.string().uuid(),
});

export type LinkProposalResult =
  | { ok: true }
  | { ok: false; code: "unauthorized" | "invalid" | "not_found" | "error" };

export async function linkProposalToProject(rawInput: unknown): Promise<LinkProposalResult> {
  const parsed = InputSchema.safeParse(rawInput);
  if (!parsed.success) return { ok: false, code: "invalid" };
  const { proposal_id, project_id } = parsed.data;

  const supabase = await createClient();
  const { data: userResult } = await supabase.auth.getUser();
  if (!userResult.user) return { ok: false, code: "unauthorized" };
  const userId = userResult.user.id;

  // Verify both belong to the user.
  const { data: project } = await supabase
    .from("projects")
    .select("id, origin_proposal_id")
    .eq("id", project_id)
    .eq("user_id", userId)
    .single();
  if (!project) return { ok: false, code: "not_found" };

  // Mark the proposal as this project's origin.
  const { error: prErr } = await supabase
    .from("proposals")
    .update({ project_id, proposal_role: "origin" })
    .eq("id", proposal_id)
    .eq("user_id", userId);
  if (prErr) {
    console.error("[linkProposalToProject] proposal update failed", { code: prErr.code, message: prErr.message });
    return { ok: false, code: "error" };
  }

  // Fill the project's origin only if it's currently empty (don't clobber).
  if (!project.origin_proposal_id) {
    await supabase
      .from("projects")
      .update({ origin_proposal_id: proposal_id, updated_at: new Date().toISOString() })
      .eq("id", project_id)
      .eq("user_id", userId);
  }

  revalidatePath("/[locale]/projects/[id]", "page");
  revalidatePath("/[locale]/proposals/[id]", "page");
  return { ok: true };
}
