"use server";

/**
 * Items catalog actions — the freelancer's reusable products/services.
 *
 * createItem powers the "+ Add item" popped dialog inside the invoice builder:
 * an unlisted item is added to the catalog (full form, no partial data) and
 * immediately returned so the caller can select it onto the current invoice.
 * Owner-scoped via RLS (public.items policy items_owner).
 */

import { z } from "zod";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// ─── Schema ──────────────────────────────────────────────────────────────────

const CreateItemSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  unit_price_sar: z.number().nonnegative(),
  category: z.string().max(100).optional(),
});

// ─── Return type ─────────────────────────────────────────────────────────────

export type CreatedItem = {
  id: string;
  name: string;
  description: string | null;
  unit_price_sar: number;
  category: string | null;
};

export type ItemActionResult =
  | { ok: true; item: CreatedItem }
  | { ok: false; code: "unauthorized" | "invalid" | "error"; message?: string };

// ─── createItem ──────────────────────────────────────────────────────────────

export async function createItem(input: unknown): Promise<ItemActionResult> {
  const parsed = CreateItemSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid" };

  const supabase = await createSupabaseClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, code: "unauthorized" };

  const d = parsed.data;

  const { data, error } = await supabase
    .from("items")
    .insert({
      user_id: userData.user.id,
      name: d.name.trim(),
      description: d.description?.trim() || null,
      unit_price_sar: d.unit_price_sar,
      category: d.category?.trim() || null,
    })
    .select("id, name, description, unit_price_sar, category")
    .single();

  if (error || !data) {
    console.error("[createItem] insert failed", { code: error?.code, message: error?.message });
    return { ok: false, code: "error", message: error?.message };
  }

  // Refresh any surface that lists the catalog (the invoice builder + catalog page).
  revalidatePath("/[locale]/invoices/new", "page");
  revalidatePath("/[locale]/catalog", "page");

  return { ok: true, item: rowToItem(data) };
}

// ─── updateItem ────────────────────────────────────────────────────────────

const UpdateItemSchema = z.object({
  id: z.string().uuid(),
  patch: z.object({
    name: z.string().min(1).max(255).optional(),
    description: z.string().max(2000).nullable().optional(),
    unit_price_sar: z.number().nonnegative().optional(),
    category: z.string().max(100).nullable().optional(),
  }),
});

export async function updateItem(input: unknown): Promise<ItemActionResult> {
  const parsed = UpdateItemSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid" };

  const supabase = await createSupabaseClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, code: "unauthorized" };

  const { id, patch } = parsed.data;

  // Build a clean update object (strip undefined; "" → null for text fields).
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const [k, v] of Object.entries(patch)) {
    if (v !== undefined) update[k] = v === "" ? null : v;
  }

  const { data, error } = await supabase
    .from("items")
    .update(update)
    .eq("id", id)
    .eq("user_id", userData.user.id)
    .select("id, name, description, unit_price_sar, category")
    .single();

  if (error || !data) {
    console.error("[updateItem] update failed", { code: error?.code, message: error?.message });
    return { ok: false, code: "error", message: error?.message };
  }

  revalidatePath("/[locale]/catalog", "page");
  revalidatePath("/[locale]/invoices/new", "page");

  return { ok: true, item: rowToItem(data) };
}

// ─── archiveItem (soft-delete) ───────────────────────────────────────────────

const ArchiveItemSchema = z.object({ id: z.string().uuid() });

export type SimpleItemResult =
  | { ok: true }
  | { ok: false; code: "unauthorized" | "invalid" | "error"; message?: string };

export async function archiveItem(input: unknown): Promise<SimpleItemResult> {
  const parsed = ArchiveItemSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid" };

  const supabase = await createSupabaseClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, code: "unauthorized" };

  const { error } = await supabase
    .from("items")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", parsed.data.id)
    .eq("user_id", userData.user.id);

  if (error) {
    console.error("[archiveItem] failed", { code: error.code, message: error.message });
    return { ok: false, code: "error", message: error.message };
  }

  revalidatePath("/[locale]/catalog", "page");
  return { ok: true };
}

// ─── helper ──────────────────────────────────────────────────────────────────

function rowToItem(data: Record<string, unknown>): CreatedItem {
  return {
    id: data.id as string,
    name: data.name as string,
    description: (data.description as string | null) ?? null,
    unit_price_sar: Number(data.unit_price_sar),
    category: (data.category as string | null) ?? null,
  };
}
