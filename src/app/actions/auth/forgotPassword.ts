"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, maybeSweep } from "@/lib/rateLimit";

const InputSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(320),
  locale: z.enum(["ar", "en"]),
});

export type ForgotPasswordResult =
  | { ok: true }
  | { ok: false; code: "invalid" | "rate_limited" | "error" };

async function getClientIp(): Promise<string> {
  const h = await headers();
  const xff = h.get("x-forwarded-for");
  return xff ? xff.split(",")[0]!.trim() : h.get("x-real-ip") ?? "unknown";
}

export async function requestPasswordReset(
  input: unknown
): Promise<ForgotPasswordResult> {
  maybeSweep();

  const parsed = InputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid" };

  const ip = await getClientIp();
  // Tighter limit on password reset to discourage email enumeration / spam.
  const rl = await checkRateLimit(`forgot:${ip}`, 3, 10 * 60 * 1000);
  if (!rl.allowed) return { ok: false, code: "rate_limited" };

  const supabase = await createClient();
  const h = await headers();
  const origin = h.get("origin") ?? process.env.NEXT_PUBLIC_APP_URL ?? "";

  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${origin}/auth/callback?next=/${parsed.data.locale}/reset-password`,
  });

  if (error) {
    // Don't leak whether the email exists — return success to the client either way.
    // We log the underlying error for debugging.
    console.error("[forgot-password] error", { code: error.code });
  }

  return { ok: true };
}
