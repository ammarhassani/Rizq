"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const BUCKET = "documents";

// ── uploadDocument ──────────────────────────────────────────────────────────

const UploadSchema = z.object({
  title_ar: z.string().min(1).max(200),
  category: z.string().optional(),
  description: z.string().optional(),
  tags: z.string().optional(),   // comma-separated
  expiry_date: z.string().optional(),
  client_id: z.string().uuid().optional(),
  // Feature 004 — scope an upload to a project as an input or deliverable doc.
  project_id: z.string().uuid().optional(),
  project_doc_kind: z.enum(["input", "deliverable"]).optional(),
});

type UploadResult =
  | { ok: true; id: string }
  | { ok: false; code: "unauthorized" | "no_file" | "quota_exhausted" | "storage_error" | "error" };

export async function uploadDocument(formData: FormData): Promise<UploadResult> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, code: "unauthorized" };
  const userId = userData.user.id;

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return { ok: false, code: "no_file" };

  const parsed = UploadSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { ok: false, code: "error" };
  const { title_ar, category, description, tags, expiry_date, client_id, project_id, project_doc_kind } = parsed.data;

  // Safe filename: strip non-ascii/special chars
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `${userId}/${crypto.randomUUID()}_${safeName}`;

  // Upload to Storage
  const { error: storageErr } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, file, { contentType: file.type });

  if (storageErr) {
    console.error("[uploadDocument] storage upload failed", storageErr);
    return { ok: false, code: "storage_error" };
  }

  // Insert row
  const tagsArr = tags
    ? tags.split(",").map((t) => t.trim()).filter(Boolean)
    : [];

  const insertPayload: Record<string, unknown> = {
    user_id: userId,
    title_ar,
    file_path: storagePath,
    file_name: file.name,
    file_size: file.size,
    file_type: file.type,
    storage_bucket: BUCKET,
    tags: tagsArr,
  };
  if (category) insertPayload.category = category;
  if (description) insertPayload.description_ar = description;
  if (expiry_date) insertPayload.expiry_date = expiry_date;
  if (client_id) insertPayload.client_id = client_id;
  if (project_id) insertPayload.project_id = project_id;
  if (project_doc_kind) insertPayload.project_doc_kind = project_doc_kind;

  const { data: row, error: insertErr } = await supabase
    .from("documents")
    .insert(insertPayload)
    .select("id")
    .single();

  if (insertErr) {
    // Quota exhausted — errcode 53400
    const code = (insertErr as { code?: string }).code;
    // Best-effort cleanup of uploaded object
    await supabase.storage.from(BUCKET).remove([storagePath]);
    if (code === "53400") return { ok: false, code: "quota_exhausted" };
    console.error("[uploadDocument] insert failed", insertErr);
    return { ok: false, code: "error" };
  }

  revalidatePath("/ar/documents");
  revalidatePath("/en/documents");
  if (project_id) revalidatePath("/[locale]/projects/[id]", "page");
  return { ok: true, id: (row as { id: string }).id };
}

// ── getDocumentSignedUrl ─────────────────────────────────────────────────────

type SignedUrlResult =
  | { ok: true; url: string }
  | { ok: false; code: "unauthorized" | "not_found" | "error" };

export async function getDocumentSignedUrl(rawInput: unknown): Promise<SignedUrlResult> {
  const parsed = z.object({ id: z.string().uuid() }).safeParse(rawInput);
  if (!parsed.success) return { ok: false, code: "error" };

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, code: "unauthorized" };

  const { data: doc, error: fetchErr } = await supabase
    .from("documents")
    .select("file_path, storage_bucket")
    .eq("id", parsed.data.id)
    .eq("user_id", userData.user.id)
    .is("deleted_at", null)
    .single();

  if (fetchErr || !doc) return { ok: false, code: "not_found" };

  const bucket = (doc.storage_bucket as string) ?? BUCKET;
  const { data: signed, error: signErr } = await supabase.storage
    .from(bucket)
    .createSignedUrl(doc.file_path as string, 60 * 10);

  if (signErr || !signed) return { ok: false, code: "error" };
  return { ok: true, url: signed.signedUrl };
}

// ── updateDocument ───────────────────────────────────────────────────────────

const UpdateSchema = z.object({
  id: z.string().uuid(),
  title_ar: z.string().min(1).max(200).optional(),
  category: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
  expiry_date: z.string().nullable().optional(),
  client_id: z.string().uuid().nullable().optional(),
  category_auto: z.string().nullable().optional(),
  category_confidence: z.number().nullable().optional(),
  expiry_detected_by: z.enum(["manual", "ai"]).optional(),
  reminder_days_before: z.number().int().positive().optional(),
});

type UpdateResult =
  | { ok: true }
  | { ok: false; code: "unauthorized" | "not_found" | "error" };

export async function updateDocument(rawInput: unknown): Promise<UpdateResult> {
  const parsed = UpdateSchema.safeParse(rawInput);
  if (!parsed.success) return { ok: false, code: "error" };
  const { id, ...fields } = parsed.data;

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, code: "unauthorized" };

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (fields.title_ar !== undefined) update.title_ar = fields.title_ar;
  if (fields.category !== undefined) update.category = fields.category;
  if (fields.description !== undefined) update.description_ar = fields.description;
  if (fields.tags !== undefined) update.tags = fields.tags;
  if (fields.expiry_date !== undefined) update.expiry_date = fields.expiry_date;
  if (fields.client_id !== undefined) update.client_id = fields.client_id;
  if (fields.category_auto !== undefined) update.category_auto = fields.category_auto;
  if (fields.category_confidence !== undefined) update.category_confidence = fields.category_confidence;
  if (fields.expiry_detected_by !== undefined) update.expiry_detected_by = fields.expiry_detected_by;
  if (fields.reminder_days_before !== undefined) update.reminder_days_before = fields.reminder_days_before;

  const { error } = await supabase
    .from("documents")
    .update(update)
    .eq("id", id)
    .eq("user_id", userData.user.id)
    .is("deleted_at", null);

  if (error) {
    console.error("[updateDocument] update failed", error);
    return { ok: false, code: "error" };
  }

  revalidatePath(`/ar/documents/${id}`);
  revalidatePath(`/en/documents/${id}`);
  revalidatePath("/ar/documents");
  revalidatePath("/en/documents");
  return { ok: true };
}

// ── deleteDocument ───────────────────────────────────────────────────────────

type DeleteResult =
  | { ok: true }
  | { ok: false; code: "unauthorized" | "not_found" | "error" };

export async function deleteDocument(rawInput: unknown): Promise<DeleteResult> {
  const parsed = z.object({ id: z.string().uuid() }).safeParse(rawInput);
  if (!parsed.success) return { ok: false, code: "error" };

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, code: "unauthorized" };

  // Load to get file_path for storage cleanup
  const { data: doc, error: fetchErr } = await supabase
    .from("documents")
    .select("file_path, storage_bucket")
    .eq("id", parsed.data.id)
    .eq("user_id", userData.user.id)
    .is("deleted_at", null)
    .single();

  if (fetchErr || !doc) return { ok: false, code: "not_found" };

  // Soft delete
  const { error: delErr } = await supabase
    .from("documents")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", parsed.data.id)
    .eq("user_id", userData.user.id);

  if (delErr) return { ok: false, code: "error" };

  // Best-effort storage cleanup
  try {
    const bucket = (doc.storage_bucket as string) ?? BUCKET;
    await supabase.storage.from(bucket).remove([doc.file_path as string]);
  } catch {
    /* best-effort */
  }

  revalidatePath("/ar/documents");
  revalidatePath("/en/documents");
  return { ok: true };
}

// ── setDocumentShare ─────────────────────────────────────────────────────────

const SetShareSchema = z.object({
  id: z.string().uuid(),
  share: z.boolean(),
  expires_in_hours: z.number().int().positive().default(72),
});

type SetShareResult =
  | { ok: true; token?: string }
  | { ok: false; code: "unauthorized" | "not_found" | "error" };

export async function setDocumentShare(rawInput: unknown): Promise<SetShareResult> {
  const parsed = SetShareSchema.safeParse(rawInput);
  if (!parsed.success) return { ok: false, code: "error" };
  const { id, share, expires_in_hours } = parsed.data;

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, code: "unauthorized" };

  const { data: doc, error: fetchErr } = await supabase
    .from("documents")
    .select("id, share_token")
    .eq("id", id)
    .eq("user_id", userData.user.id)
    .is("deleted_at", null)
    .single();

  if (fetchErr || !doc) return { ok: false, code: "not_found" };

  let token = (doc.share_token as string | null) ?? undefined;
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (share) {
    if (!token) {
      const bytes = new Uint8Array(18);
      crypto.getRandomValues(bytes);
      token = btoa(String.fromCharCode(...bytes))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=/g, "");
      update.share_token = token;
    }
    const expiresAt = new Date(Date.now() + expires_in_hours * 60 * 60 * 1000);
    update.share_expires_at = expiresAt.toISOString();
  } else {
    update.share_expires_at = null;
  }

  const { error: updateErr } = await supabase
    .from("documents")
    .update(update)
    .eq("id", id)
    .eq("user_id", userData.user.id);

  if (updateErr) return { ok: false, code: "error" };

  revalidatePath(`/ar/documents/${id}`);
  revalidatePath(`/en/documents/${id}`);
  return share ? { ok: true, token } : { ok: true };
}

// ── suggestCategoryAction ────────────────────────────────────────────────────

import { categorizeDocument } from "@/lib/ai/documentCategorize";

type SuggestCategoryResult =
  | { ok: true; category: string; confidence: number }
  | { ok: false };

export async function suggestCategoryAction(rawInput: unknown): Promise<SuggestCategoryResult> {
  const parsed = z.object({
    filename: z.string(),
    file_type: z.string(),
    title: z.string().optional(),
    description: z.string().optional(),
  }).safeParse(rawInput);
  if (!parsed.success) return { ok: false };

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false };

  const result = await categorizeDocument(parsed.data);
  if (!result) return { ok: false };
  return { ok: true, ...result };
}

// ── suggestExpiryAction ──────────────────────────────────────────────────────

import { detectDocumentExpiry } from "@/lib/ai/documentExpiry";

type SuggestExpiryResult =
  | { ok: true; expiry_date: string | null; confidence: number }
  | { ok: false };

export async function suggestExpiryAction(rawInput: unknown): Promise<SuggestExpiryResult> {
  const parsed = z.object({
    title: z.string(),
    description: z.string().optional(),
    category: z.string().optional(),
  }).safeParse(rawInput);
  if (!parsed.success) return { ok: false };

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false };

  const result = await detectDocumentExpiry(parsed.data);
  if (!result) return { ok: false };
  return { ok: true, ...result };
}
