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

  return {
    ok: true,
    preset: {
      id: data.id as string,
      name: data.name as string,
      category: (data.category as string | null) ?? null,
      amount_sar: Number(data.amount_sar),
    },
  };
}
