"use server";

/**
 * Project Workspace (spec 004) — Deliverables facet (tasks T011/T012).
 *
 * The Deliverables list is a curated VIEW (not a new store): deliverable-kind
 * documents ∪ the project's integration links, each with a handover state
 * (draft → ready → sent). `setDeliverableState` advances an item via the pure
 * state machine, writing handover_state on the underlying row. Owner-scoped.
 */

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { canAdvance } from "@/lib/projects/deliverableState";

export type DeliverableItem = {
  source: "file" | "link";
  id: string;
  label: string;
  url: string | null; // external_url for links; null for files (opened via signed URL)
  provider: string | null;
  handover_state: string | null;
};

export type GetDeliverablesResult =
  | { ok: true; items: DeliverableItem[] }
  | { ok: false; code: "unauthorized" | "error" };

export async function getProjectDeliverables(projectId: string): Promise<GetDeliverablesResult> {
  const supabase = await createClient();
  const { data: userResult } = await supabase.auth.getUser();
  if (!userResult.user) return { ok: false, code: "unauthorized" };
  const userId = userResult.user.id;

  const [{ data: docs }, { data: links }] = await Promise.all([
    supabase
      .from("documents")
      .select("id, title_ar, file_name, handover_state")
      .eq("project_id", projectId)
      .eq("user_id", userId)
      .eq("project_doc_kind", "deliverable")
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
    supabase
      .from("project_integrations")
      .select("id, display_label, external_url, provider, handover_state")
      .eq("project_id", projectId)
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
  ]);

  const items: DeliverableItem[] = [
    ...(docs ?? []).map((d) => ({
      source: "file" as const,
      id: d.id as string,
      label: (d.title_ar as string) ?? (d.file_name as string),
      url: null,
      provider: null,
      handover_state: (d.handover_state as string | null) ?? null,
    })),
    ...(links ?? []).map((l) => ({
      source: "link" as const,
      id: l.id as string,
      label: l.display_label as string,
      url: l.external_url as string,
      provider: l.provider as string,
      handover_state: (l.handover_state as string | null) ?? null,
    })),
  ];

  return { ok: true, items };
}

const SetStateSchema = z.object({
  source: z.enum(["file", "link"]),
  id: z.string().uuid(),
  target: z.enum(["draft", "ready", "sent"]),
});

export type SetDeliverableStateResult =
  | { ok: true }
  | { ok: false; code: "unauthorized" | "invalid" | "not_found" | "invalid_transition" | "error" };

export async function setDeliverableState(rawInput: unknown): Promise<SetDeliverableStateResult> {
  const parsed = SetStateSchema.safeParse(rawInput);
  if (!parsed.success) return { ok: false, code: "invalid" };
  const { source, id, target } = parsed.data;

  const supabase = await createClient();
  const { data: userResult } = await supabase.auth.getUser();
  if (!userResult.user) return { ok: false, code: "unauthorized" };
  const userId = userResult.user.id;

  const table = source === "file" ? "documents" : "project_integrations";

  const { data: row } = await supabase
    .from(table)
    .select("id, handover_state")
    .eq("id", id)
    .eq("user_id", userId)
    .single();
  if (!row) return { ok: false, code: "not_found" };

  if (!canAdvance(row.handover_state as string | null, target)) {
    return { ok: false, code: "invalid_transition" };
  }

  const { error } = await supabase
    .from(table)
    .update({ handover_state: target, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", userId);
  if (error) {
    console.error("[setDeliverableState] update failed", { code: error.code, message: error.message });
    return { ok: false, code: "error" };
  }

  revalidatePath("/[locale]/projects/[id]", "page");
  return { ok: true };
}
