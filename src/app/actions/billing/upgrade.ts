"use server";

/**
 * Billing / upgrade server actions — Phase-6 P6.6.
 *
 * Tier model:
 *   public.users.role  'free' | 'pro' | 'admin'
 *   public.users.pro_until  timestamptz
 *
 * Pro = role === 'pro' || role === 'admin'.
 *
 * Tap Payments is a founder blocker — checkout is NOT wired yet.
 * startUpgradeAction returns a "coming_soon" status so the UI can show
 * a contact / waitlist state.  Adding Tap later is a drop-in:
 * replace the TODO block with a real checkout-session call and return
 * { ok: true, status: "redirect", url: "<tap-checkout-url>" }.
 */

import { z } from "zod";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";

// ─── Shared auth helper ───────────────────────────────────────────────────────

async function getAuthContext() {
  const supabase = await createSupabaseClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return null;

  const { data: profile } = await supabase
    .from("users")
    .select("role, pro_until")
    .eq("id", userData.user.id)
    .single();

  return {
    supabase,
    userId: userData.user.id,
    role: (profile?.role ?? "free") as "free" | "pro" | "admin",
    pro_until: (profile?.pro_until as string | null) ?? null,
  };
}

function isPro(role: "free" | "pro" | "admin"): boolean {
  return role === "pro" || role === "admin";
}

// ─── Return types ─────────────────────────────────────────────────────────────

export type StartUpgradeResult =
  | {
      ok: true;
      /** "coming_soon" until Tap is wired; "redirect" once live */
      status: "coming_soon";
      contact: string;
    }
  | { ok: false; code: "unauthorized" | "error" };

export type GrantProResult =
  | { ok: true; user_id: string; pro_until: string }
  | { ok: false; code: "unauthorized" | "forbidden" | "not_found" | "error" };

export type MyTierResult =
  | {
      ok: true;
      role: "free" | "pro" | "admin";
      pro_until: string | null;
      isPro: boolean;
    }
  | { ok: false; code: "unauthorized" };

// ─── Input schemas ────────────────────────────────────────────────────────────

const StartUpgradeSchema = z.object({
  plan: z.enum(["monthly", "annual"]),
});

const GrantProSchema = z.object({
  user_id: z.string().uuid("user_id must be a valid UUID"),
  months: z.number().int().positive().max(120),
});

// ─── startUpgradeAction ───────────────────────────────────────────────────────

/**
 * Initiates an upgrade for the current user.
 *
 * Currently returns { status: "coming_soon" } because Tap Payments is not
 * yet wired.  The caller should show a "checkout launching soon" UI.
 *
 * TODO(founder): wire Tap Payments checkout here.
 * Shape expected once live:
 *   const tapSession = await tapClient.createCheckoutSession({
 *     amount: plan === "annual" ? 49000 : 4900,   // halalas
 *     currency: "SAR",
 *     customer_email: user.email,
 *     metadata: { user_id: ctx.userId, plan },
 *     success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/upgrade?success=1`,
 *     cancel_url:  `${process.env.NEXT_PUBLIC_BASE_URL}/upgrade?cancelled=1`,
 *   });
 *   return { ok: true, status: "redirect", url: tapSession.url };
 */
export async function startUpgradeAction(
  input: unknown
): Promise<StartUpgradeResult> {
  const parsed = StartUpgradeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "error" };

  const ctx = await getAuthContext();
  if (!ctx) return { ok: false, code: "unauthorized" };

  // Tap Payments not yet integrated — return coming-soon seam.
  return {
    ok: true,
    status: "coming_soon",
    contact: "hello@rizq.sa",
  };
}

// ─── grantProAction ───────────────────────────────────────────────────────────

/**
 * Admin-only: manually grant Pro access to a target user for N months.
 * Used for comps, testing, and manual go-live until Tap is wired.
 *
 * Caller MUST be role === 'admin'.  The target is identified by user_id.
 * This is intentionally NOT self-service — an admin grants to others.
 */
export async function grantProAction(
  input: unknown
): Promise<GrantProResult> {
  const parsed = GrantProSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "error" };
  const { user_id, months } = parsed.data;

  const ctx = await getAuthContext();
  if (!ctx) return { ok: false, code: "unauthorized" };
  if (ctx.role !== "admin") return { ok: false, code: "forbidden" };

  const { supabase } = ctx;

  // Verify target user exists
  const { data: targetProfile, error: fetchErr } = await supabase
    .from("users")
    .select("id, role, pro_until")
    .eq("id", user_id)
    .single();

  if (fetchErr || !targetProfile) return { ok: false, code: "not_found" };

  // Compute new pro_until: extend from now (or existing pro_until if future)
  const existingUntil =
    targetProfile.pro_until && new Date(targetProfile.pro_until as string) > new Date()
      ? new Date(targetProfile.pro_until as string)
      : new Date();

  const newUntil = new Date(existingUntil);
  newUntil.setMonth(newUntil.getMonth() + months);

  const { error: updateErr } = await supabase
    .from("users")
    .update({
      role: "pro",
      pro_until: newUntil.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", user_id);

  if (updateErr) return { ok: false, code: "error" };

  return { ok: true, user_id, pro_until: newUntil.toISOString() };
}

// ─── getMyTierAction ──────────────────────────────────────────────────────────

/**
 * Returns the current user's tier info: role, pro_until, isPro.
 * Lightweight — used by the upgrade page to show "already Pro" state.
 */
export async function getMyTierAction(): Promise<MyTierResult> {
  const ctx = await getAuthContext();
  if (!ctx) return { ok: false, code: "unauthorized" };

  return {
    ok: true,
    role: ctx.role,
    pro_until: ctx.pro_until,
    isPro: isPro(ctx.role),
  };
}
