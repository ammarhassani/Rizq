"use server";

import { z } from "zod";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// ─── Zod schemas ───────────────────────────────────────────────────────────

const GigStatusEnum = z.enum(["pending", "deposit_paid", "in_progress", "delivered", "paid", "overdue", "cancelled"]);
const PaymentMethodEnum = z.enum(["bank_transfer", "stc_pay", "cash", "other"]);

const CreateGigSchema = z.object({
  title: z.string().min(1).max(255),
  amount_sar: z.number().positive(),
  client_id: z.string().uuid().optional(),
  status: GigStatusEnum.optional().default("pending"),
  delivery_date: z.string().optional(), // ISO date string
  category: z.string().max(100).optional(),
  description: z.string().optional(),
  payment_method: PaymentMethodEnum.optional(),
});

const UpdateGigSchema = z.object({
  id: z.string().uuid(),
  patch: z.object({
    title: z.string().min(1).max(255).optional(),
    amount_sar: z.number().positive().optional(),
    deposit_pct: z.number().int().min(0).max(100).optional(), // trigger recomputes deposit/remaining
    client_id: z.string().uuid().nullable().optional(),
    status: GigStatusEnum.optional(),
    delivery_date: z.string().nullable().optional(),
    start_date: z.string().nullable().optional(),
    category: z.string().max(100).nullable().optional(),
    description: z.string().nullable().optional(),
    payment_method: PaymentMethodEnum.optional(),
    payment_notes: z.string().nullable().optional(),
  }),
});

const MarkGigStatusSchema = z.object({
  id: z.string().uuid(),
  status: GigStatusEnum,
});

// ─── Return types ──────────────────────────────────────────────────────────

export type GigActionResult =
  | { ok: true; id: string }
  | { ok: false; code: "unauthorized" | "invalid" | "quota_exhausted" | "not_found" | "error"; message?: string };

export type SimpleActionResult =
  | { ok: true }
  | { ok: false; code: "unauthorized" | "invalid" | "not_found" | "error"; message?: string };

// ─── createGig ─────────────────────────────────────────────────────────────

export async function createGig(input: unknown): Promise<GigActionResult> {
  const parsed = CreateGigSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid" };

  const supabase = await createSupabaseClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, code: "unauthorized" };

  const d = parsed.data;
  const today = new Date().toISOString().split("T")[0];

  // Every gig is the money child of a Project (the umbrella). Create the parent
  // project first, then the gig linked to it — so logged income always appears
  // in /projects and has a workspace, never an orphan.
  const { data: project, error: projectErr } = await supabase
    .from("projects")
    .insert({
      user_id: userData.user.id,
      title: d.title.trim(),
      status: "active",
      client_id: d.client_id ?? null,
    })
    .select("id")
    .single();

  if (projectErr || !project) {
    return { ok: false, code: "error", message: projectErr?.message };
  }

  const { data, error } = await supabase
    .from("gigs")
    .insert({
      user_id: userData.user.id,
      project_id: project.id,
      title: d.title.trim(),
      amount_sar: d.amount_sar,
      client_id: d.client_id ?? null,
      status: d.status ?? "pending",
      delivery_date: d.delivery_date ?? today,
      category: d.category?.trim() ?? null,
      description: d.description?.trim() ?? null,
      payment_method: d.payment_method ?? "bank_transfer",
    })
    .select("id")
    .single();

  if (error) {
    // Roll back the orphan project so quota stays the single source of truth.
    await supabase.from("projects").delete().eq("id", project.id).eq("user_id", userData.user.id);
    if (error.code === "53400") return { ok: false, code: "quota_exhausted" };
    return { ok: false, code: "error", message: error.message };
  }

  // If a client_id was given: insert a gig_created timeline event + bump last_contacted_at
  if (d.client_id && data) {
    await supabase.from("client_timeline").insert({
      client_id: d.client_id,
      user_id: userData.user.id,
      event_type: "gig_created",
      event_data: { gig_id: data.id, title: d.title.trim(), amount_sar: d.amount_sar },
    });
    await supabase
      .from("clients")
      .update({ last_contacted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", d.client_id)
      .eq("user_id", userData.user.id);
  }

  revalidatePath("/[locale]/income", "page");
  revalidatePath("/[locale]/projects", "page");
  return { ok: true, id: data.id };
}

// ─── updateGig ─────────────────────────────────────────────────────────────

export async function updateGig(input: unknown): Promise<SimpleActionResult> {
  const parsed = UpdateGigSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid" };

  const supabase = await createSupabaseClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, code: "unauthorized" };

  const { id, patch } = parsed.data;

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const [k, v] of Object.entries(patch)) {
    if (v !== undefined) update[k] = v === "" ? null : v;
  }

  const { error } = await supabase
    .from("gigs")
    .update(update)
    .eq("id", id)
    .eq("user_id", userData.user.id);

  if (error) return { ok: false, code: "error", message: error.message };

  revalidatePath("/[locale]/income", "page");
  revalidatePath(`/[locale]/income/${id}`, "page");
  revalidatePath("/[locale]/projects/[id]", "page"); // money child may be shown on its project
  return { ok: true };
}

// ─── markGigStatus ─────────────────────────────────────────────────────────

export async function markGigStatus(input: unknown): Promise<SimpleActionResult> {
  const parsed = MarkGigStatusSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid" };

  const supabase = await createSupabaseClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, code: "unauthorized" };

  const { id, status } = parsed.data;
  const now = new Date().toISOString();

  const update: Record<string, unknown> = { status, updated_at: now };
  if (status === "paid") {
    update.final_paid_at = now;
    update.completed_date = now.split("T")[0]; // will be set below only if null
  }
  if (status === "delivered") {
    update.completed_date = now.split("T")[0];
  }

  // Fetch the gig first so we know the client_id and existing completed_date
  const { data: existing } = await supabase
    .from("gigs")
    .select("client_id, completed_date, title, amount_sar")
    .eq("id", id)
    .eq("user_id", userData.user.id)
    .single();

  if (!existing) return { ok: false, code: "not_found" };

  // If already has completed_date and status is paid, keep it
  if (status === "paid" && existing.completed_date) {
    delete update.completed_date;
  }

  const { error } = await supabase
    .from("gigs")
    .update(update)
    .eq("id", id)
    .eq("user_id", userData.user.id);

  if (error) return { ok: false, code: "error", message: error.message };

  // Insert client_timeline event for paid/delivered/completed
  if (existing.client_id && (status === "paid" || status === "delivered")) {
    await supabase.from("client_timeline").insert({
      client_id: existing.client_id,
      user_id: userData.user.id,
      event_type: "gig_completed",
      event_data: {
        gig_id: id,
        title: existing.title,
        amount_sar: existing.amount_sar,
        new_status: status,
      },
    });
  }

  revalidatePath("/[locale]/income", "page");
  revalidatePath(`/[locale]/income/${id}`, "page");
  revalidatePath("/[locale]/projects", "page");
  revalidatePath("/[locale]/projects/[id]", "page");
  return { ok: true };
}

// ─── deleteGig ─────────────────────────────────────────────────────────────

export async function deleteGig(input: unknown): Promise<SimpleActionResult> {
  const parsed = z.object({ id: z.string().uuid() }).safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid" };

  const supabase = await createSupabaseClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, code: "unauthorized" };

  const { error } = await supabase
    .from("gigs")
    .delete()
    .eq("id", parsed.data.id)
    .eq("user_id", userData.user.id);

  if (error) return { ok: false, code: "error", message: error.message };

  revalidatePath("/[locale]/income", "page");
  return { ok: true };
}
