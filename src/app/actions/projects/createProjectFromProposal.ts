"use server";

/**
 * createProjectFromProposal — Feature 002 (Project hub), task T011.
 *
 * Project-first replacement for the "create from proposal" flow. Creates the
 * project shell, then its money child via the existing createGigFromProposal
 * (so deposit math, client rollup, the gig-quota, and the timeline event all
 * fire exactly as before — no behavior change to the money engine). Marks the
 * originating proposal as the project's `origin`.
 *
 * Ordering: create the project, then create the gig WITH project_id. If the gig
 * insert trips the free-tier quota (errcode 53400), the just-created project is
 * rolled back so no orphan shell remains (FR-014).
 */

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { createGigFromProposal } from "@/app/actions/gigs/createGigFromProposal";
import { deriveProjectTitle } from "@/lib/projects/title";
import { artifactTitle } from "@/lib/proposals/artifact";

const InputSchema = z.object({
  proposal_id: z.string().uuid(),
});

export type CreateProjectFromProposalResult =
  | { ok: true; project_id: string; gig_id: string }
  | {
      ok: false;
      code: "unauthorized" | "invalid" | "not_found" | "quota_exhausted" | "error";
    };

export async function createProjectFromProposal(
  rawInput: unknown
): Promise<CreateProjectFromProposalResult> {
  const parsed = InputSchema.safeParse(rawInput);
  if (!parsed.success) return { ok: false, code: "invalid" };
  const { proposal_id } = parsed.data;

  const supabase = await createClient();

  const { data: userResult } = await supabase.auth.getUser();
  if (!userResult.user) return { ok: false, code: "unauthorized" };
  const userId = userResult.user.id;

  // Load the proposal (owner-scoped) for title + client derivation.
  const { data: proposal, error: fetchErr } = await supabase
    .from("proposals")
    .select("id, client_id, project_id, scope_json, artifact_json, specialties(name_ar, name_en, slug)")
    .eq("id", proposal_id)
    .eq("user_id", userId)
    .single();

  if (fetchErr || !proposal) return { ok: false, code: "not_found" };

  // Idempotency: a proposal already converted into a project must NOT spawn a second
  // project + money gig on re-tap (double-click, back-navigate + retap). Return the
  // existing one instead of duplicating (which would double-count income + client rollups).
  // ponytail: app-level guard covers the sequential re-tap case; add a UNIQUE index on
  // projects(origin_proposal_id) if truly concurrent taps ever need to be deduped.
  const existingProjectId = (proposal.project_id as string | null) ?? null;
  if (existingProjectId) {
    const { data: existingProject } = await supabase
      .from("projects")
      .select("id")
      .eq("id", existingProjectId)
      .eq("user_id", userId)
      .maybeSingle();
    if (existingProject) {
      const { data: existingGig } = await supabase
        .from("gigs")
        .select("id")
        .eq("project_id", existingProjectId)
        .eq("user_id", userId)
        .limit(1)
        .maybeSingle();
      return { ok: true, project_id: existingProjectId, gig_id: (existingGig?.id as string) ?? "" };
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const specialtyRaw = proposal.specialties as any;
  const specialtyName: string | null =
    specialtyRaw?.name_ar ?? specialtyRaw?.name_en ?? null;
  const title = deriveProjectTitle(
    proposal.scope_json as { deliverables?: unknown } | null,
    specialtyName,
    artifactTitle(proposal.artifact_json)
  );
  const clientId = (proposal.client_id as string | null) ?? null;

  // 1. Insert the project shell.
  const { data: projectData, error: projectErr } = await supabase
    .from("projects")
    .insert({
      user_id: userId,
      client_id: clientId,
      origin_proposal_id: proposal_id,
      title,
      status: "active",
    })
    .select("id")
    .single();

  if (projectErr || !projectData) {
    console.error("[createProjectFromProposal] project insert failed", {
      code: projectErr?.code,
      message: projectErr?.message,
    });
    return { ok: false, code: "error" };
  }

  const projectId = projectData.id as string;

  // 2. Create the money child gig (existing logic — trips quota, deposit math,
  //    client rollup, timeline event). Pass project_id so it links on insert.
  const gigResult = await createGigFromProposal({ proposal_id, project_id: projectId });

  if (!gigResult.ok) {
    // Roll back the orphan project so quota stays the single source of truth.
    await supabase.from("projects").delete().eq("id", projectId).eq("user_id", userId);
    return { ok: false, code: gigResult.code === "quota_exhausted" ? "quota_exhausted" : gigResult.code };
  }

  // 3. Mark the originating proposal as this project's origin (best-effort).
  try {
    await supabase
      .from("proposals")
      .update({ project_id: projectId, proposal_role: "origin" })
      .eq("id", proposal_id)
      .eq("user_id", userId);
  } catch (err) {
    console.warn("[createProjectFromProposal] proposal origin link failed", err);
  }

  revalidatePath("/[locale]/projects/[id]", "page");
  revalidatePath("/[locale]/income", "page");

  return { ok: true, project_id: projectId, gig_id: gigResult.gig_id };
}
