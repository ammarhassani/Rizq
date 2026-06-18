"use server";

/**
 * Fee preset actions — categorized fixed fees the freelancer reuses on invoices.
 *
 * createFeePreset powers the "+ Add fee" popped dialog inside the invoice
 * builder: a new fee is saved as a reusable preset (full form, no partial data)
 * and returned so the caller can add it onto the current invoice immediately.
 * Owner-scoped via RLS (public.fee_presets policy fee_presets_owner).
 */

import { z } from "zod";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// ─── Schema ──────────────────────────────────────────────────────────────────

// A fee preset is either a fixed SAR amount or a percentage of the items
// subtotal. We validate per-kind: fixed needs amount_sar > 0; percentage needs
// 0 < percentage <= 100. The other field is normalised to its neutral value.
const CreateFeePresetSchema = z
  .object({
    name: z.string().min(1).max(255),
    category: z.string().max(100).optional(),
    fee_type: z.enum(["fixed", "percentage"]).default("fixed"),
    amount_sar: z.number().nonnegative().default(0),
    percentage: z.number().min(0).max(100).nullable().optional(),
  })
  .refine(
    (d) => (d.fee_type === "percentage" ? (d.percentage ?? 0) > 0 : d.amount_sar > 0),
    { message: "A fixed fee needs an amount; a percentage fee needs a rate." }
  );

// ─── Return type ─────────────────────────────────────────────────────────────

export type CreatedFeePreset = {
  id: string;
  name: string;
  category: string | null;
  amount_sar: number;
  fee_type: "fixed" | "percentage";
  percentage: number | null;
};

export type FeePresetActionResult =
  | { ok: true; preset: CreatedFeePreset }
  | { ok: false; code: "unauthorized" | "invalid" | "error"; message?: string };

// ─── createFeePreset ─────────────────────────────────────────────────────────

export async function createFeePreset(input: unknown): Promise<FeePresetActionResult> {
  const parsed = CreateFeePresetSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid" };

  const supabase = await createSupabaseClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, code: "unauthorized" };

  const d = parsed.data;
  const isPct = d.fee_type === "percentage";

  const { data, error } = await supabase
    .from("fee_presets")
    .insert({
      user_id: userData.user.id,
      name: d.name.trim(),
      category: d.category?.trim() || null,
      fee_type: d.fee_type,
      amount_sar: isPct ? 0 : d.amount_sar,
      percentage: isPct ? (d.percentage ?? 0) : null,
    })
    .select("id, name, category, amount_sar, fee_type, percentage")
    .single();

  if (error || !data) {
    console.error("[createFeePreset] insert failed", { code: error?.code, message: error?.message });
    return { ok: false, code: "error", message: error?.message };
  }

  revalidatePath("/[locale]/invoices/new", "page");
  revalidatePath("/[locale]/catalog", "page");

  return { ok: true, preset: rowToPreset(data) };
}

// ─── updateFeePreset ─────────────────────────────────────────────────────────

const UpdateFeePresetSchema = z.object({
  id: z.string().uuid(),
  patch: z.object({
    name: z.string().min(1).max(255).optional(),
    category: z.string().max(100).nullable().optional(),
    fee_type: z.enum(["fixed", "percentage"]).optional(),
    amount_sar: z.number().nonnegative().optional(),
    percentage: z.number().min(0).max(100).nullable().optional(),
  }),
});

export async function updateFeePreset(input: unknown): Promise<FeePresetActionResult> {
  const parsed = UpdateFeePresetSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid" };

  const supabase = await createSupabaseClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, code: "unauthorized" };

  const { id, patch } = parsed.data;

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.name !== undefined) update.name = patch.name.trim();
  if (patch.category !== undefined) update.category = patch.category?.trim() || null;
  // When the kind changes, keep the two value columns consistent: a percentage
  // fee zeroes amount_sar; a fixed fee nulls percentage.
  if (patch.fee_type !== undefined) {
    update.fee_type = patch.fee_type;
    if (patch.fee_type === "percentage") {
      update.amount_sar = 0;
      update.percentage = patch.percentage ?? 0;
    } else {
      update.percentage = null;
      update.amount_sar = patch.amount_sar ?? 0;
    }
  } else {
    if (patch.amount_sar !== undefined) update.amount_sar = patch.amount_sar;
    if (patch.percentage !== undefined) update.percentage = patch.percentage;
  }

  const { data, error } = await supabase
    .from("fee_presets")
    .update(update)
    .eq("id", id)
    .eq("user_id", userData.user.id)
    .select("id, name, category, amount_sar, fee_type, percentage")
    .single();

  if (error || !data) {
    console.error("[updateFeePreset] update failed", { code: error?.code, message: error?.message });
    return { ok: false, code: "error", message: error?.message };
  }

  revalidatePath("/[locale]/catalog", "page");
  revalidatePath("/[locale]/invoices/new", "page");

  return { ok: true, preset: rowToPreset(data) };
}

export type SimpleFeeResult =
  | { ok: true }
  | { ok: false; code: "unauthorized" | "invalid" | "error"; message?: string };

// ─── setFeePresetsActive (archive / restore, single or bulk) ─────────────────

const SetFeePresetsActiveSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(500),
  active: z.boolean(),
});

export async function setFeePresetsActive(input: unknown): Promise<SimpleFeeResult> {
  const parsed = SetFeePresetsActiveSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid" };

  const supabase = await createSupabaseClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, code: "unauthorized" };

  const { error } = await supabase
    .from("fee_presets")
    .update({ is_active: parsed.data.active, updated_at: new Date().toISOString() })
    .in("id", parsed.data.ids)
    .eq("user_id", userData.user.id);

  if (error) {
    console.error("[setFeePresetsActive] failed", { code: error.code, message: error.message });
    return { ok: false, code: "error", message: error.message };
  }

  revalidatePath("/[locale]/catalog", "page");
  revalidatePath("/[locale]/invoices/new", "page");
  return { ok: true };
}

// ─── deleteFeePresets (hard delete, single or bulk) ──────────────────────────

const DeleteFeePresetsSchema = z.object({ ids: z.array(z.string().uuid()).min(1).max(500) });

export async function deleteFeePresets(input: unknown): Promise<SimpleFeeResult> {
  const parsed = DeleteFeePresetsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid" };

  const supabase = await createSupabaseClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, code: "unauthorized" };

  const { error } = await supabase
    .from("fee_presets")
    .delete()
    .in("id", parsed.data.ids)
    .eq("user_id", userData.user.id);

  if (error) {
    console.error("[deleteFeePresets] failed", { code: error.code, message: error.message });
    return { ok: false, code: "error", message: error.message };
  }

  revalidatePath("/[locale]/catalog", "page");
  revalidatePath("/[locale]/invoices/new", "page");
  return { ok: true };
}

// ─── importFeePresets (bulk insert from CSV) ─────────────────────────────────

const ImportFeePresetsSchema = z.object({
  rows: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(255),
        category: z.string().max(100).optional(),
        fee_type: z.enum(["fixed", "percentage"]).default("fixed"),
        amount_sar: z.number().nonnegative().default(0),
        percentage: z.number().min(0).max(100).nullable().optional(),
      })
    )
    .min(1)
    .max(1000),
});

export type ImportFeePresetsResult =
  | { ok: true; inserted: number }
  | { ok: false; code: "unauthorized" | "invalid" | "error"; message?: string };

export async function importFeePresets(input: unknown): Promise<ImportFeePresetsResult> {
  const parsed = ImportFeePresetsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid" };

  const supabase = await createSupabaseClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, code: "unauthorized" };
  const userId = userData.user.id;

  const rows = parsed.data.rows.map((r) => {
    const isPct = r.fee_type === "percentage";
    return {
      user_id: userId,
      name: r.name.trim(),
      category: r.category?.trim() || null,
      fee_type: r.fee_type,
      amount_sar: isPct ? 0 : r.amount_sar,
      percentage: isPct ? (r.percentage ?? 0) : null,
    };
  });

  const { data, error } = await supabase.from("fee_presets").insert(rows).select("id");
  if (error) {
    console.error("[importFeePresets] failed", { code: error.code, message: error.message });
    return { ok: false, code: "error", message: error.message };
  }

  revalidatePath("/[locale]/catalog", "page");
  revalidatePath("/[locale]/invoices/new", "page");
  return { ok: true, inserted: data?.length ?? 0 };
}

// ─── helper ──────────────────────────────────────────────────────────────────

function rowToPreset(data: Record<string, unknown>): CreatedFeePreset {
  const feeType = data.fee_type === "percentage" ? "percentage" : "fixed";
  return {
    id: data.id as string,
    name: data.name as string,
    category: (data.category as string | null) ?? null,
    amount_sar: Number(data.amount_sar) || 0,
    fee_type: feeType,
    percentage: data.percentage != null ? Number(data.percentage) : null,
  };
}
