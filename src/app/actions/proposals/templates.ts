"use server";

/**
 * Proposal template CRUD server actions — Phase-2 task 2.10.
 *
 * All actions are owner-gated: auth.getUser() is called first.
 * Returns discriminated-union results (never throws to the client).
 *
 * Table: public.proposal_templates
 * Columns: id, user_id, name_ar, name_en, description_ar, specialty_id,
 *          scope_json, pricing_json, tone_preference, usage_count,
 *          is_default, created_at, updated_at
 * RLS: owner-only (authenticated only).
 */

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { derivePricingJson } from "@/lib/proposals/templateHelpers";
import type { PricingJson } from "@/lib/proposals/templateHelpers";

// ---------------------------------------------------------------------------
// Shared TemplateRow type (returned in list + useTemplate)
// ---------------------------------------------------------------------------

export type TemplateRow = {
  id: string;
  name_ar: string;
  name_en: string | null;
  specialty_id: string | null;
  specialty_name: string | null;
  tone_preference: string;
  usage_count: number;
  is_default: boolean;
  created_at: string;
  updated_at: string;
};

// ---------------------------------------------------------------------------
// saveTemplateFromProposal
// ---------------------------------------------------------------------------

const SaveTemplateSchema = z.object({
  proposal_id: z.string().uuid(),
  name_ar: z.string().min(1).max(120),
  name_en: z.string().max(120).optional(),
  set_default: z.boolean().optional(),
});

export type SaveTemplateResult =
  | { ok: true; template_id: string }
  | { ok: false; code: "unauthorized" | "invalid" | "not_found" | "error" };

export async function saveTemplateFromProposal(
  rawInput: unknown
): Promise<SaveTemplateResult> {
  const parsed = SaveTemplateSchema.safeParse(rawInput);
  if (!parsed.success) return { ok: false, code: "invalid" };
  const input = parsed.data;

  const supabase = await createClient();
  const { data: userResult } = await supabase.auth.getUser();
  if (!userResult.user) return { ok: false, code: "unauthorized" };
  const userId = userResult.user.id;

  // Load the owner's proposal (scope_json, specialty_id, tone_preference)
  const { data: proposal, error: propErr } = await supabase
    .from("proposals")
    .select("scope_json, specialty_id, tone_preference")
    .eq("id", input.proposal_id)
    .eq("user_id", userId)
    .single();

  if (propErr || !proposal) return { ok: false, code: "not_found" };

  const pricingJson = derivePricingJson({
    scope_json: (proposal.scope_json as Record<string, unknown>) ?? {},
    tone_preference: proposal.tone_preference as string | null,
  });

  // If set_default, unset all other defaults first
  if (input.set_default) {
    await supabase
      .from("proposal_templates")
      .update({ is_default: false, updated_at: new Date().toISOString() })
      .eq("user_id", userId);
  }

  const { data: inserted, error: insertErr } = await supabase
    .from("proposal_templates")
    .insert({
      user_id: userId,
      name_ar: input.name_ar,
      name_en: input.name_en ?? null,
      specialty_id: (proposal.specialty_id as string | null) ?? null,
      scope_json: proposal.scope_json,
      pricing_json: pricingJson,
      tone_preference: pricingJson.tone_preference,
      is_default: input.set_default ?? false,
    })
    .select("id")
    .single();

  if (insertErr || !inserted) {
    console.error(
      "[saveTemplateFromProposal] insert failed",
      insertErr?.message
    );
    return { ok: false, code: "error" };
  }

  return { ok: true, template_id: inserted.id as string };
}

// ---------------------------------------------------------------------------
// listTemplates
// ---------------------------------------------------------------------------

export type ListTemplatesResult =
  | { ok: true; templates: TemplateRow[] }
  | { ok: false; code: "unauthorized" | "error" };

export async function listTemplates(): Promise<ListTemplatesResult> {
  const supabase = await createClient();
  const { data: userResult } = await supabase.auth.getUser();
  if (!userResult.user) return { ok: false, code: "unauthorized" };

  const { data, error } = await supabase
    .from("proposal_templates")
    .select(
      "id, name_ar, name_en, specialty_id, tone_preference, usage_count, is_default, created_at, updated_at, specialties(name_ar, name_en)"
    )
    .eq("user_id", userResult.user.id)
    .order("is_default", { ascending: false })
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("[listTemplates] query failed", error.message);
    return { ok: false, code: "error" };
  }

  const templates: TemplateRow[] = (data ?? []).map((row) => {
    // The joined relation may come back as an object, array, or null depending
    // on the Supabase generated types version. Normalize to object | null.
    const rawSp = row.specialties as unknown;
    const sp: { name_ar: string; name_en: string } | null = Array.isArray(rawSp)
      ? (rawSp[0] as { name_ar: string; name_en: string } | undefined) ?? null
      : (rawSp as { name_ar: string; name_en: string } | null);

    return {
      id: row.id as string,
      name_ar: row.name_ar as string,
      name_en: row.name_en as string | null,
      specialty_id: row.specialty_id as string | null,
      specialty_name: sp?.name_ar ?? null,
      tone_preference: row.tone_preference as string,
      usage_count: row.usage_count as number,
      is_default: row.is_default as boolean,
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
    };
  });

  return { ok: true, templates };
}

// ---------------------------------------------------------------------------
// setDefaultTemplate
// ---------------------------------------------------------------------------

const SetDefaultSchema = z.object({ template_id: z.string().uuid() });

export type SetDefaultResult =
  | { ok: true }
  | { ok: false; code: "unauthorized" | "invalid" | "error" };

export async function setDefaultTemplate(
  rawInput: unknown
): Promise<SetDefaultResult> {
  const parsed = SetDefaultSchema.safeParse(rawInput);
  if (!parsed.success) return { ok: false, code: "invalid" };

  const supabase = await createClient();
  const { data: userResult } = await supabase.auth.getUser();
  if (!userResult.user) return { ok: false, code: "unauthorized" };
  const userId = userResult.user.id;

  const now = new Date().toISOString();

  // Unset all defaults for this user
  await supabase
    .from("proposal_templates")
    .update({ is_default: false, updated_at: now })
    .eq("user_id", userId);

  // Set the target as default (owner-gated by user_id)
  const { error } = await supabase
    .from("proposal_templates")
    .update({ is_default: true, updated_at: now })
    .eq("id", parsed.data.template_id)
    .eq("user_id", userId);

  if (error) {
    console.error("[setDefaultTemplate] update failed", error.message);
    return { ok: false, code: "error" };
  }

  return { ok: true };
}

// ---------------------------------------------------------------------------
// deleteTemplate
// ---------------------------------------------------------------------------

const DeleteSchema = z.object({ template_id: z.string().uuid() });

export type DeleteTemplateResult =
  | { ok: true }
  | { ok: false; code: "unauthorized" | "invalid" | "error" };

export async function deleteTemplate(
  rawInput: unknown
): Promise<DeleteTemplateResult> {
  const parsed = DeleteSchema.safeParse(rawInput);
  if (!parsed.success) return { ok: false, code: "invalid" };

  const supabase = await createClient();
  const { data: userResult } = await supabase.auth.getUser();
  if (!userResult.user) return { ok: false, code: "unauthorized" };

  const { error } = await supabase
    .from("proposal_templates")
    .delete()
    .eq("id", parsed.data.template_id)
    .eq("user_id", userResult.user.id);

  if (error) {
    console.error("[deleteTemplate] delete failed", error.message);
    return { ok: false, code: "error" };
  }

  return { ok: true };
}

// ---------------------------------------------------------------------------
// useTemplate — increment usage_count and return the template
// ---------------------------------------------------------------------------

const UseTemplateSchema = z.object({ template_id: z.string().uuid() });

export type UseTemplateResult =
  | {
      ok: true;
      template: TemplateRow & { pricing_json: PricingJson };
    }
  | { ok: false; code: "unauthorized" | "invalid" | "not_found" | "error" };

export async function useTemplate(
  rawInput: unknown
): Promise<UseTemplateResult> {
  const parsed = UseTemplateSchema.safeParse(rawInput);
  if (!parsed.success) return { ok: false, code: "invalid" };

  const supabase = await createClient();
  const { data: userResult } = await supabase.auth.getUser();
  if (!userResult.user) return { ok: false, code: "unauthorized" };
  const userId = userResult.user.id;

  const { data: row, error } = await supabase
    .from("proposal_templates")
    .select(
      "id, name_ar, name_en, specialty_id, tone_preference, usage_count, is_default, created_at, updated_at, pricing_json, specialties(name_ar, name_en)"
    )
    .eq("id", parsed.data.template_id)
    .eq("user_id", userId)
    .single();

  if (error || !row) return { ok: false, code: "not_found" };

  const newCount = (row.usage_count as number) + 1;

  // Increment usage_count (fire-and-forget — don't block the return)
  supabase
    .from("proposal_templates")
    .update({ usage_count: newCount, updated_at: new Date().toISOString() })
    .eq("id", parsed.data.template_id)
    .then(() => {/* no-op */});

  const rawSp2 = row.specialties as unknown;
  const sp: { name_ar: string; name_en: string } | null = Array.isArray(rawSp2)
    ? (rawSp2[0] as { name_ar: string; name_en: string } | undefined) ?? null
    : (rawSp2 as { name_ar: string; name_en: string } | null);

  return {
    ok: true,
    template: {
      id: row.id as string,
      name_ar: row.name_ar as string,
      name_en: row.name_en as string | null,
      specialty_id: row.specialty_id as string | null,
      specialty_name: sp?.name_ar ?? null,
      tone_preference: row.tone_preference as string,
      usage_count: newCount,
      is_default: row.is_default as boolean,
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
      pricing_json: row.pricing_json as PricingJson,
    },
  };
}
