"use server";

/**
 * Phase C — client testimonials CRUD for the Studio profile editor.
 *
 * The testimonials feed the proposal "About you" section (social proof).
 * Owner-scoped writes only (RLS policy `testimonials_owner` enforces
 * auth.uid() = user_id; the action also auth-guards explicitly).
 *
 * Save uses REPLACE-ALL semantics: the editor manages the whole (small)
 * per-user list, so we delete the user's existing rows and insert the new
 * set. sort_order is derived from array index; all saved rows are is_active.
 */

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A testimonial row as surfaced to the editor (includes inactive). */
export type TestimonialRow = {
  id: string;
  client_name: string | null;
  client_title: string | null;
  quote_ar: string | null;
  quote_en: string | null;
  rating: number | null;
  sort_order: number;
  is_active: boolean;
};

export type ListTestimonialsResult =
  | { ok: true; testimonials: TestimonialRow[] }
  | { ok: false; code: "unauthorized" | "error" };

export type SaveTestimonialsResult =
  | { ok: true }
  | { ok: false; code: "unauthorized" | "invalid" | "error" };

// ---------------------------------------------------------------------------
// Input schema
// ---------------------------------------------------------------------------

const TestimonialInputSchema = z.object({
  client_name: z.string().trim().max(120).optional().nullable(),
  client_title: z.string().trim().max(120).optional().nullable(),
  quote_ar: z.string().trim().max(1000).optional().nullable(),
  quote_en: z.string().trim().max(1000).optional().nullable(),
  rating: z.number().int().min(1).max(5).optional().nullable(),
});

const SaveTestimonialsSchema = z.array(TestimonialInputSchema).max(20);

// ---------------------------------------------------------------------------
// listTestimonials — current user's full set (incl. inactive), ordered
// ---------------------------------------------------------------------------

export async function listTestimonials(): Promise<ListTestimonialsResult> {
  const supabase = await createClient();

  const { data: userResult } = await supabase.auth.getUser();
  if (!userResult.user) return { ok: false, code: "unauthorized" };
  const userId = userResult.user.id;

  const { data, error } = await supabase
    .from("testimonials")
    .select(
      "id, client_name, client_title, quote_ar, quote_en, rating, sort_order, is_active"
    )
    .eq("user_id", userId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[listTestimonials] query failed", error.code);
    return { ok: false, code: "error" };
  }

  // Untyped client — cast each field defensively.
  const rows = (data ?? []) as Array<Record<string, unknown>>;
  const testimonials: TestimonialRow[] = rows.map((row, idx) => {
    const rawRating = row["rating"];
    const rawSort = row["sort_order"];
    return {
      id: String(row["id"]),
      client_name: (row["client_name"] as string | null) ?? null,
      client_title: (row["client_title"] as string | null) ?? null,
      quote_ar: (row["quote_ar"] as string | null) ?? null,
      quote_en: (row["quote_en"] as string | null) ?? null,
      rating: typeof rawRating === "number" ? rawRating : null,
      sort_order: typeof rawSort === "number" ? rawSort : idx,
      is_active: row["is_active"] !== false,
    };
  });

  return { ok: true, testimonials };
}

// ---------------------------------------------------------------------------
// saveTestimonials — REPLACE-ALL the user's testimonials
// ---------------------------------------------------------------------------

export async function saveTestimonials(
  rawInput: unknown
): Promise<SaveTestimonialsResult> {
  const parsed = SaveTestimonialsSchema.safeParse(rawInput);
  if (!parsed.success) return { ok: false, code: "invalid" };

  const supabase = await createClient();

  const { data: userResult } = await supabase.auth.getUser();
  if (!userResult.user) return { ok: false, code: "unauthorized" };
  const userId = userResult.user.id;

  // Drop rows with no quote in EITHER language (empty rows the editor left blank).
  const cleaned = parsed.data
    .map((row) => ({
      client_name: (row.client_name ?? "").trim() || null,
      client_title: (row.client_title ?? "").trim() || null,
      quote_ar: (row.quote_ar ?? "").trim() || null,
      quote_en: (row.quote_en ?? "").trim() || null,
      rating: row.rating ?? null,
    }))
    .filter((row) => row.quote_ar !== null || row.quote_en !== null);

  // 1. Delete the user's existing testimonials (owner-scoped).
  const { error: delError } = await supabase
    .from("testimonials")
    .delete()
    .eq("user_id", userId);

  if (delError) {
    console.error("[saveTestimonials] delete failed", delError.code);
    return { ok: false, code: "error" };
  }

  // 2. Insert the provided set (sort_order = index, is_active = true).
  if (cleaned.length > 0) {
    const insertRows = cleaned.map((row, idx) => ({
      user_id: userId,
      client_name: row.client_name,
      client_title: row.client_title,
      quote_ar: row.quote_ar,
      quote_en: row.quote_en,
      rating: row.rating,
      sort_order: idx,
      is_active: true,
    }));

    const { error: insError } = await supabase
      .from("testimonials")
      .insert(insertRows);

    if (insError) {
      console.error("[saveTestimonials] insert failed", insError.code);
      return { ok: false, code: "error" };
    }
  }

  revalidatePath("/[locale]/settings/profile", "page");
  return { ok: true };
}
