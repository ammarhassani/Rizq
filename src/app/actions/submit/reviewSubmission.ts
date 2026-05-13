"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const ReviewSchema = z.object({
  submission_id: z.string().uuid(),
  action: z.enum(["approve", "reject", "needs_info"]),
  moderator_notes: z.string().trim().max(2000).optional().nullable(),
});

export type ReviewResult =
  | { ok: true }
  | { ok: false; code: "invalid" | "not_admin" | "error" };

export async function reviewSubmission(input: unknown): Promise<ReviewResult> {
  const parsed = ReviewSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid" };

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, code: "not_admin" };

  // Defense-in-depth: even though RLS would block non-admin updates,
  // check role explicitly to give a clean error code.
  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", userData.user.id)
    .single();
  if (profile?.role !== "admin") return { ok: false, code: "not_admin" };

  const status =
    parsed.data.action === "approve"
      ? "approved"
      : parsed.data.action === "reject"
        ? "rejected"
        : "needs_info";

  const { error } = await supabase
    .from("pricing_submissions")
    .update({
      status,
      moderator_notes: parsed.data.moderator_notes ?? null,
      reviewed_at: new Date().toISOString(),
      reviewed_by: userData.user.id,
    })
    .eq("id", parsed.data.submission_id);

  if (error) {
    console.error("[review_submission] error", {
      code: error.code,
      message: error.message,
    });
    return { ok: false, code: "error" };
  }

  revalidatePath("/[locale]/admin", "page");
  return { ok: true };
}
