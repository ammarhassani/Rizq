"use server";

/**
 * createBlankProject (feature 005, US4 — "set up directly").
 *
 * Creates a money-free, proposal-free project: just a `projects` row, no gig.
 * The derived lifecycle then shows proposal = skipped, project = current; money
 * arrives later when the user adds the value (a gig) or logs income. No gig ⇒ no
 * money-quota path is touched. Owner-scoped (RLS).
 */

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const InputSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
});

export type CreateBlankProjectResult =
  | { ok: true; project_id: string }
  | { ok: false; code: "unauthorized" | "invalid" | "error"; message?: string };

export async function createBlankProject(rawInput: unknown): Promise<CreateBlankProjectResult> {
  const parsed = InputSchema.safeParse(rawInput ?? {});
  if (!parsed.success) return { ok: false, code: "invalid" };

  const supabase = await createClient();
  const { data: userResult } = await supabase.auth.getUser();
  if (!userResult.user) return { ok: false, code: "unauthorized" };

  const title = parsed.data.title?.trim() || "مشروع جديد";

  const { data: project, error } = await supabase
    .from("projects")
    .insert({
      user_id: userResult.user.id,
      title,
      status: "active",
    })
    .select("id")
    .single();

  if (error || !project) {
    return { ok: false, code: "error", message: error?.message };
  }

  revalidatePath("/[locale]/projects", "page");
  return { ok: true, project_id: project.id as string };
}
