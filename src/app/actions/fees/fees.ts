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

const CreateFeePresetSchema = z.object({
  name: z.string().min(1).max(255),
  category: z.string().max(100).optional(),
  amount_sar: z.number().nonnegative(),
});

// ─── Return type ─────────────────────────────────────────────────────────────

export type CreatedFeePreset = {
  id: string;
  name: string;
  category: string | null;
  amount_sar: number;
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

  const { data, error } = await supabase
    .from("fee_presets")
    .insert({
      user_id: userData.user.id,
      name: d.name.trim(),
      category: d.category?.trim() || null,
      amount_sar: d.amount_sar,
    })
    .select("id, name, category, amount_sar")
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
    amount_sar: z.number().nonnegative().optional(),
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
  for (const [k, v] of Object.entries(patch)) {
    if (v !== undefined) update[k] = v === "" ? null : v;
  }

  const { data, error } = await supabase
    .from("fee_presets")
    .update(update)
    .eq("id", id)
    .eq("user_id", userData.user.id)
    .select("id, name, category, amount_sar")
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
        amount_sar: z.number().nonnegative(),
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

  const rows = parsed.data.rows.map((r) => ({
    user_id: userId,
    name: r.name.trim(),
    category: r.category?.trim() || null,
    amount_sar: r.amount_sar,
  }));

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
  return {
    id: data.id as string,
    name: data.name as string,
    category: (data.category as string | null) ?? null,
    amount_sar: Number(data.amount_sar),
  };
}
