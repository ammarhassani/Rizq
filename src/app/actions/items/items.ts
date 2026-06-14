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

  // Refresh any surface that lists the catalog (the invoice builder).
  revalidatePath("/[locale]/invoices/new", "page");

  return {
    ok: true,
    item: {
      id: data.id as string,
      name: data.name as string,
      description: (data.description as string | null) ?? null,
      unit_price_sar: Number(data.unit_price_sar),
      category: (data.category as string | null) ?? null,
    },
  };
}
