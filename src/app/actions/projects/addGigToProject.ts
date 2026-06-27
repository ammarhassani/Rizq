"use server";

/**
 * addGigToProject (feature 005, US4 — "Set up the value").
 *
 * Attaches the money child (gig) to an EXISTING blank project (createGig is for
 * brand-new projects and would mint a second project). Once the gig exists the
 * derived lifecycle advances from ② to ③ and the normal invoice path applies.
 * Owner-scoped; the gig-quota trigger applies exactly as for any gig.
 */

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const InputSchema = z.object({
  project_id: z.string().uuid(),
  amount_sar: z.number().positive().max(100_000_000),
  deposit_pct: z.number().min(0).max(100).optional(),
});

export type AddGigToProjectResult =
  | { ok: true; gig_id: string }
  | { ok: false; code: "unauthorized" | "invalid" | "not_found" | "exists" | "quota_exhausted" | "error"; message?: string };

export async function addGigToProject(rawInput: unknown): Promise<AddGigToProjectResult> {
  const parsed = InputSchema.safeParse(rawInput);
  if (!parsed.success) return { ok: false, code: "invalid" };
  const { project_id, amount_sar, deposit_pct } = parsed.data;

  const supabase = await createClient();
  const { data: userResult } = await supabase.auth.getUser();
  if (!userResult.user) return { ok: false, code: "unauthorized" };
  const userId = userResult.user.id;

  // Owner-scoped project load (+ guard against a project that already has a gig).
  const { data: project, error: projErr } = await supabase
    .from("projects")
    .select("id, title, client_id")
    .eq("id", project_id)
    .eq("user_id", userId)
    .single();
  if (projErr || !project) return { ok: false, code: "not_found" };

  const { data: existing } = await supabase
    .from("gigs")
    .select("id")
    .eq("project_id", project_id)
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();
  if (existing) return { ok: false, code: "exists" };

  const today = new Date().toISOString().split("T")[0];
  const { data: gig, error } = await supabase
    .from("gigs")
    .insert({
      user_id: userId,
      project_id,
      client_id: (project.client_id as string | null) ?? null,
      title: (project.title as string) ?? "مشروع",
      amount_sar,
      deposit_pct: deposit_pct ?? 50,
      status: "pending",
      delivery_date: today,
      payment_method: "bank_transfer",
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "53400") return { ok: false, code: "quota_exhausted" };
    return { ok: false, code: "error", message: error.message };
  }

  revalidatePath("/[locale]/projects", "page");
  revalidatePath("/[locale]/projects/[id]", "page");
  revalidatePath("/[locale]/income", "page");
  return { ok: true, gig_id: gig.id as string };
}
