"use server";

/**
 * addProjectIntegration — Feature 002 (Project hub), task T018.
 *
 * Inserts a project integration after pure validation (known provider +
 * well-formed http(s) URL + non-empty label). NO credentials/secrets are
 * accepted — OAuth is deferred. Owner-scoped; unique (project_id, provider,
 * external_url) → `duplicate`.
 */

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { validateIntegrationInput } from "@/lib/projects/integrations";

const InputSchema = z.object({
  project_id: z.string().uuid(),
  provider: z.string(),
  external_url: z.string(),
  display_label: z.string(),
  connection_id: z.string().uuid().optional(), // links a real provider connection (Phase 5)
});

export type AddProjectIntegrationResult =
  | { ok: true; integration_id: string }
  | { ok: false; code: "unauthorized" | "invalid" | "not_found" | "duplicate" | "error" };

export async function addProjectIntegration(
  rawInput: unknown
): Promise<AddProjectIntegrationResult> {
  const parsed = InputSchema.safeParse(rawInput);
  if (!parsed.success) return { ok: false, code: "invalid" };

  const validation = validateIntegrationInput({
    provider: parsed.data.provider,
    external_url: parsed.data.external_url,
    display_label: parsed.data.display_label,
  });
  if (!validation.ok) return { ok: false, code: "invalid" };

  const supabase = await createClient();

  const { data: userResult } = await supabase.auth.getUser();
  if (!userResult.user) return { ok: false, code: "unauthorized" };
  const userId = userResult.user.id;

  // Ownership check (RLS also enforces, but gives a clean not_found).
  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", parsed.data.project_id)
    .eq("user_id", userId)
    .single();
  if (!project) return { ok: false, code: "not_found" };

  const { data, error } = await supabase
    .from("project_integrations")
    .insert({
      user_id: userId,
      project_id: parsed.data.project_id,
      provider: validation.value.provider,
      external_url: validation.value.external_url,
      display_label: validation.value.display_label,
      status: "linked",
      ...(parsed.data.connection_id ? { connection_id: parsed.data.connection_id } : {}),
    })
    .select("id")
    .single();

  if (error || !data) {
    if (error?.code === "23505") return { ok: false, code: "duplicate" };
    console.error("[addProjectIntegration] insert failed", { code: error?.code, message: error?.message });
    return { ok: false, code: "error" };
  }

  revalidatePath("/[locale]/projects/[id]", "page");
  return { ok: true, integration_id: data.id as string };
}
