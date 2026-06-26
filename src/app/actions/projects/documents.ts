"use server";

/**
 * Project Workspace (spec 004) — Files facet actions (task T005).
 * Scope an existing document to a project, and switch its input/deliverable
 * kind. Owner-scoped; reuses the pure docKind rule. No new storage logic.
 */

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { docKindPatch } from "@/lib/projects/docKind";

const AttachSchema = z.object({
  document_id: z.string().uuid(),
  project_id: z.string().uuid(),
  kind: z.enum(["input", "deliverable"]),
});

const SetKindSchema = z.object({
  document_id: z.string().uuid(),
  kind: z.enum(["input", "deliverable"]),
});

export type DocumentActionResult =
  | { ok: true }
  | { ok: false; code: "unauthorized" | "invalid" | "not_found" | "error" };

async function ownerUpdateDocument(
  documentId: string,
  patch: Record<string, unknown>
): Promise<DocumentActionResult> {
  const supabase = await createClient();
  const { data: userResult } = await supabase.auth.getUser();
  if (!userResult.user) return { ok: false, code: "unauthorized" };

  const { data: doc } = await supabase
    .from("documents")
    .select("id")
    .eq("id", documentId)
    .eq("user_id", userResult.user.id)
    .is("deleted_at", null)
    .single();
  if (!doc) return { ok: false, code: "not_found" };

  const { error } = await supabase
    .from("documents")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", documentId)
    .eq("user_id", userResult.user.id);
  if (error) {
    console.error("[projects/documents] update failed", { code: error.code, message: error.message });
    return { ok: false, code: "error" };
  }

  revalidatePath("/[locale]/projects/[id]", "page");
  return { ok: true };
}

export async function attachDocumentToProject(rawInput: unknown): Promise<DocumentActionResult> {
  const parsed = AttachSchema.safeParse(rawInput);
  if (!parsed.success) return { ok: false, code: "invalid" };
  return ownerUpdateDocument(parsed.data.document_id, {
    project_id: parsed.data.project_id,
    ...docKindPatch(parsed.data.kind),
  });
}

export async function setDocumentKind(rawInput: unknown): Promise<DocumentActionResult> {
  const parsed = SetKindSchema.safeParse(rawInput);
  if (!parsed.success) return { ok: false, code: "invalid" };
  return ownerUpdateDocument(parsed.data.document_id, docKindPatch(parsed.data.kind));
}
