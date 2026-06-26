"use server";

/**
 * archiveProject — Feature 002 (Project hub), task T017 (FR-017).
 *
 * The delete path for a project. If the project has a money record (a linked
 * gig) and/or any invoices, it is SOFT-ARCHIVED — marked inactive, linked
 * records preserved — so historical income totals and invoices survive
 * (Constitution VI, "never drop data"). Only an empty shell (no money, no
 * invoices) is hard-deleted. Idempotent: archiving an archived project is a
 * no-op success.
 */

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { resolveArchiveMode } from "@/lib/projects/archive";

const InputSchema = z.object({ project_id: z.string().uuid() });

export type ArchiveProjectResult =
  | { ok: true; mode: "archived" | "deleted" }
  | { ok: false; code: "unauthorized" | "invalid" | "not_found" | "error" };

export async function archiveProject(rawInput: unknown): Promise<ArchiveProjectResult> {
  const parsed = InputSchema.safeParse(rawInput);
  if (!parsed.success) return { ok: false, code: "invalid" };
  const { project_id } = parsed.data;

  const supabase = await createClient();

  const { data: userResult } = await supabase.auth.getUser();
  if (!userResult.user) return { ok: false, code: "unauthorized" };
  const userId = userResult.user.id;

  const { data: project, error: projErr } = await supabase
    .from("projects")
    .select("id, is_active")
    .eq("id", project_id)
    .eq("user_id", userId)
    .single();

  if (projErr || !project) return { ok: false, code: "not_found" };

  // Already archived → idempotent success.
  if (project.is_active === false) return { ok: true, mode: "archived" };

  // Money record present?
  const { count: gigCount } = await supabase
    .from("gigs")
    .select("id", { count: "exact", head: true })
    .eq("project_id", project_id)
    .eq("user_id", userId);

  // Invoices present?
  const { count: invoiceCount } = await supabase
    .from("invoices")
    .select("id", { count: "exact", head: true })
    .eq("project_id", project_id)
    .eq("user_id", userId);

  const mode = resolveArchiveMode({
    hasMoneyRecord: (gigCount ?? 0) > 0,
    invoiceCount: invoiceCount ?? 0,
  });

  if (mode === "archived") {
    const { error: updErr } = await supabase
      .from("projects")
      .update({ is_active: false, status: "archived", archived_at: new Date().toISOString() })
      .eq("id", project_id)
      .eq("user_id", userId);
    if (updErr) {
      console.error("[archiveProject] soft-archive failed", { code: updErr.code, message: updErr.message });
      return { ok: false, code: "error" };
    }
  } else {
    // Empty shell — safe to hard-delete (cascades to the empty gig, if any).
    const { error: delErr } = await supabase
      .from("projects")
      .delete()
      .eq("id", project_id)
      .eq("user_id", userId);
    if (delErr) {
      console.error("[archiveProject] delete failed", { code: delErr.code, message: delErr.message });
      return { ok: false, code: "error" };
    }
  }

  revalidatePath("/[locale]/projects/[id]", "page");
  revalidatePath("/[locale]/income", "page");

  return { ok: true, mode };
}
