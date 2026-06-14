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

export type SimpleItemResult =
  | { ok: true }
  | { ok: false; code: "unauthorized" | "invalid" | "error"; message?: string };

// ─── setItemsActive (archive / restore, single or bulk) ──────────────────────

const SetItemsActiveSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(500),
  active: z.boolean(),
});

export async function setItemsActive(input: unknown): Promise<SimpleItemResult> {
  const parsed = SetItemsActiveSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid" };

  const supabase = await createSupabaseClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, code: "unauthorized" };

  const { error } = await supabase
    .from("items")
    .update({ is_active: parsed.data.active, updated_at: new Date().toISOString() })
    .in("id", parsed.data.ids)
    .eq("user_id", userData.user.id);

  if (error) {
    console.error("[setItemsActive] failed", { code: error.code, message: error.message });
    return { ok: false, code: "error", message: error.message };
  }

  revalidatePath("/[locale]/catalog", "page");
  revalidatePath("/[locale]/invoices/new", "page");
  return { ok: true };
}

// ─── deleteItems (hard delete, single or bulk) ───────────────────────────────
// Safe: invoices store their own line snapshots (jsonb), not FKs to items.

const DeleteItemsSchema = z.object({ ids: z.array(z.string().uuid()).min(1).max(500) });

export async function deleteItems(input: unknown): Promise<SimpleItemResult> {
  const parsed = DeleteItemsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid" };

  const supabase = await createSupabaseClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, code: "unauthorized" };

  const { error } = await supabase
    .from("items")
    .delete()
    .in("id", parsed.data.ids)
    .eq("user_id", userData.user.id);

  if (error) {
    console.error("[deleteItems] failed", { code: error.code, message: error.message });
    return { ok: false, code: "error", message: error.message };
  }

  revalidatePath("/[locale]/catalog", "page");
  revalidatePath("/[locale]/invoices/new", "page");
  return { ok: true };
}

// ─── importItems (bulk insert from CSV) ──────────────────────────────────────

const ImportItemsSchema = z.object({
  rows: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(255),
        description: z.string().max(2000).optional(),
        unit_price_sar: z.number().nonnegative(),
        category: z.string().max(100).optional(),
      })
    )
    .min(1)
    .max(1000),
});

export type ImportItemsResult =
  | { ok: true; inserted: number }
  | { ok: false; code: "unauthorized" | "invalid" | "error"; message?: string };

export async function importItems(input: unknown): Promise<ImportItemsResult> {
  const parsed = ImportItemsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid" };

  const supabase = await createSupabaseClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, code: "unauthorized" };
  const userId = userData.user.id;

  const rows = parsed.data.rows.map((r) => ({
    user_id: userId,
    name: r.name.trim(),
    description: r.description?.trim() || null,
    unit_price_sar: r.unit_price_sar,
    category: r.category?.trim() || null,
  }));

  const { data, error } = await supabase.from("items").insert(rows).select("id");
  if (error) {
    console.error("[importItems] failed", { code: error.code, message: error.message });
    return { ok: false, code: "error", message: error.message };
  }

  revalidatePath("/[locale]/catalog", "page");
  revalidatePath("/[locale]/invoices/new", "page");
  return { ok: true, inserted: data?.length ?? 0 };
}

// ─── getItemSalesHistory ──────────────────────────────────────────────────────
// Aggregates where this item appears on the user's invoices. Invoice lines carry
// item_id from the catalog picker, so history is precise for invoices created
// after item-linkage shipped; older snapshots without item_id are not linked.

const SalesHistorySchema = z.object({ item_id: z.string().uuid() });

export type ItemSalesHistory = {
  count: number;        // invoices containing this item
  totalQty: number;
  totalRevenue: number; // Σ matching line totals (pre-VAT)
  recent: Array<{
    invoice_id: string;
    invoice_number: string;
    date: string;
    status: string;
    clientName: string | null;
    qty: number;
    lineTotal: number;
  }>;
};

export type SalesHistoryResult =
  | { ok: true; history: ItemSalesHistory }
  | { ok: false; code: "unauthorized" | "invalid" | "error" };

export async function getItemSalesHistory(input: unknown): Promise<SalesHistoryResult> {
  const parsed = SalesHistorySchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid" };
  const itemId = parsed.data.item_id;

  const supabase = await createSupabaseClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, code: "unauthorized" };
  const userId = userData.user.id;

  const { data: invoices, error } = await supabase
    .from("invoices")
    .select("id, invoice_number, created_at, status, client_id, items")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[getItemSalesHistory] failed", { code: error.code, message: error.message });
    return { ok: false, code: "error" };
  }

  // Resolve client names once.
  const clientIds = Array.from(
    new Set((invoices ?? []).map((i) => i.client_id as string | null).filter(Boolean) as string[])
  );
  const clientNames = new Map<string, string>();
  if (clientIds.length > 0) {
    const { data: clients } = await supabase
      .from("clients")
      .select("id, name")
      .eq("user_id", userId)
      .in("id", clientIds);
    for (const c of clients ?? []) clientNames.set(c.id as string, c.name as string);
  }

  let count = 0;
  let totalQty = 0;
  let totalRevenue = 0;
  const recent: ItemSalesHistory["recent"] = [];

  for (const inv of invoices ?? []) {
    const lines = Array.isArray(inv.items) ? (inv.items as Array<Record<string, unknown>>) : [];
    let qty = 0;
    let lineTotal = 0;
    let matched = false;
    for (const line of lines) {
      if (line && line["item_id"] === itemId) {
        matched = true;
        qty += Number(line["quantity"]) || 0;
        lineTotal += Number(line["total_sar"]) || 0;
      }
    }
    if (!matched) continue;
    count += 1;
    totalQty += qty;
    totalRevenue += lineTotal;
    if (recent.length < 10) {
      recent.push({
        invoice_id: inv.id as string,
        invoice_number: inv.invoice_number as string,
        date: inv.created_at as string,
        status: inv.status as string,
        clientName: clientNames.get(inv.client_id as string) ?? null,
        qty,
        lineTotal: Math.round(lineTotal * 100) / 100,
      });
    }
  }

  return {
    ok: true,
    history: {
      count,
      totalQty,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      recent,
    },
  };
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
