"use server";

import { z } from "zod";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// ─── Zod schemas ───────────────────────────────────────────────────────────

const CreateClientSchema = z.object({
  name: z.string().min(1).max(255),
  name_en: z.string().max(255).optional(),
  company: z.string().max(255).optional(),
  title: z.string().max(255).optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().max(30).optional(),
  phone_whatsapp: z.string().max(30).optional(),
  city: z.string().max(100).optional(),
  client_type: z.enum(["individual", "smb", "corporate", "government", "agency"]).optional(),
  industry: z.string().max(100).optional(),
  source: z.enum(["referral", "platform", "social_media", "direct", "other"]).optional(),
  source_detail: z.string().max(255).optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
  rating: z.number().int().min(1).max(5).optional(),
});

const UpdateClientSchema = z.object({
  id: z.string().uuid(),
  patch: z.object({
    name: z.string().min(1).max(255).optional(),
    name_en: z.string().max(255).optional(),
    company: z.string().max(255).optional(),
    title: z.string().max(255).optional(),
    email: z.string().email().optional().or(z.literal("")),
    phone: z.string().max(30).optional(),
    phone_whatsapp: z.string().max(30).optional(),
    city: z.string().max(100).optional(),
    client_type: z.enum(["individual", "smb", "corporate", "government", "agency"]).optional(),
    industry: z.string().max(100).optional(),
    source: z.enum(["referral", "platform", "social_media", "direct", "other"]).optional(),
    source_detail: z.string().max(255).optional(),
    tags: z.array(z.string()).optional(),
    notes: z.string().optional(),
    rating: z.number().int().min(1).max(5).optional().nullable(),
    follow_up_priority: z.enum(["low", "medium", "high"]).optional(),
  }),
});

const ArchiveClientSchema = z.object({ id: z.string().uuid() });

const AddClientNoteSchema = z.object({
  id: z.string().uuid(),
  note: z.string().min(1),
});

const LogContactSchema = z.object({ id: z.string().uuid() });

// ─── Return types ──────────────────────────────────────────────────────────

export type ClientActionResult =
  | { ok: true; id: string }
  | { ok: false; code: "unauthorized" | "invalid" | "quota_exhausted" | "not_found" | "error"; message?: string };

export type SimpleActionResult =
  | { ok: true }
  | { ok: false; code: "unauthorized" | "invalid" | "not_found" | "error"; message?: string };

// ─── createClient ──────────────────────────────────────────────────────────

export async function createClient(input: unknown): Promise<ClientActionResult> {
  const parsed = CreateClientSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid" };

  const supabase = await createSupabaseClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, code: "unauthorized" };

  const d = parsed.data;

  // Smart default: phone_whatsapp = phone if empty
  const phone_whatsapp = d.phone_whatsapp?.trim() || d.phone?.trim() || null;
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("clients")
    .insert({
      user_id: userData.user.id,
      name: d.name.trim(),
      name_en: d.name_en?.trim() || null,
      company: d.company?.trim() || null,
      title: d.title?.trim() || null,
      email: d.email?.trim() || null,
      phone: d.phone?.trim() || null,
      phone_whatsapp,
      city: d.city?.trim() || null,
      client_type: d.client_type ?? "individual",
      industry: d.industry?.trim() || null,
      source: d.source ?? "direct",
      source_detail: d.source_detail?.trim() || null,
      tags: d.tags ?? [],
      notes: d.notes?.trim() || null,
      rating: d.rating ?? null,
      first_contacted_at: now,
      last_contacted_at: now,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "53400") return { ok: false, code: "quota_exhausted" };
    return { ok: false, code: "error", message: error.message };
  }

  revalidatePath("/[locale]/clients", "page");
  return { ok: true, id: data.id };
}

// ─── updateClient ──────────────────────────────────────────────────────────

export async function updateClient(input: unknown): Promise<SimpleActionResult> {
  const parsed = UpdateClientSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid" };

  const supabase = await createSupabaseClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, code: "unauthorized" };

  const { id, patch } = parsed.data;

  // Build a clean update object (strip undefined values)
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const [k, v] of Object.entries(patch)) {
    if (v !== undefined) update[k] = v === "" ? null : v;
  }

  const { error } = await supabase
    .from("clients")
    .update(update)
    .eq("id", id)
    .eq("user_id", userData.user.id);

  if (error) return { ok: false, code: "error", message: error.message };

  revalidatePath("/[locale]/clients", "page");
  revalidatePath(`/[locale]/clients/${id}`, "page");
  return { ok: true };
}

// ─── archiveClient ─────────────────────────────────────────────────────────

export async function archiveClient(input: unknown): Promise<SimpleActionResult> {
  const parsed = ArchiveClientSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid" };

  const supabase = await createSupabaseClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, code: "unauthorized" };

  const { error } = await supabase
    .from("clients")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", parsed.data.id)
    .eq("user_id", userData.user.id);

  if (error) return { ok: false, code: "error" };

  revalidatePath("/[locale]/clients", "page");
  return { ok: true };
}

// ─── addClientNote ─────────────────────────────────────────────────────────

export async function addClientNote(input: unknown): Promise<SimpleActionResult> {
  const parsed = AddClientNoteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid" };

  const supabase = await createSupabaseClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, code: "unauthorized" };

  const { id, note } = parsed.data;
  const now = new Date().toISOString();

  // Fetch existing notes
  const { data: existing } = await supabase
    .from("clients")
    .select("notes")
    .eq("id", id)
    .eq("user_id", userData.user.id)
    .single();

  if (!existing) return { ok: false, code: "not_found" };

  // Append timestamped note
  const timestamp = new Date().toLocaleString("en-SA", { timeZone: "Asia/Riyadh", hour12: false });
  const appended = existing.notes
    ? `${existing.notes}\n\n[${timestamp}]\n${note.trim()}`
    : `[${timestamp}]\n${note.trim()}`;

  const { error: updateErr } = await supabase
    .from("clients")
    .update({ notes: appended, last_contacted_at: now, updated_at: now })
    .eq("id", id)
    .eq("user_id", userData.user.id);

  if (updateErr) return { ok: false, code: "error" };

  // Insert timeline event
  await supabase.from("client_timeline").insert({
    client_id: id,
    user_id: userData.user.id,
    event_type: "note_added",
    event_data: { note: note.trim() },
  });

  revalidatePath(`/[locale]/clients/${id}`, "page");
  return { ok: true };
}

// ─── logContact ────────────────────────────────────────────────────────────

export async function logContact(input: unknown): Promise<SimpleActionResult> {
  const parsed = LogContactSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid" };

  const supabase = await createSupabaseClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, code: "unauthorized" };

  const { id } = parsed.data;
  const now = new Date().toISOString();

  const { error } = await supabase
    .from("clients")
    .update({ last_contacted_at: now, updated_at: now })
    .eq("id", id)
    .eq("user_id", userData.user.id);

  if (error) return { ok: false, code: "error" };

  await supabase.from("client_timeline").insert({
    client_id: id,
    user_id: userData.user.id,
    event_type: "contacted",
    event_data: {},
  });

  revalidatePath(`/[locale]/clients/${id}`, "page");
  return { ok: true };
}
