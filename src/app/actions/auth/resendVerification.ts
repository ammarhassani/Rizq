"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, maybeSweep } from "@/lib/rateLimit";

const InputSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(320),
  locale: z.enum(["ar", "en"]),
});

export type ResendResult =
  | { ok: true }
  | { ok: false; code: "invalid" | "rate_limited" | "error" };

async function getClientIp(): Promise<string> {
  const h = await headers();
  const xff = h.get("x-forwarded-for");
  return xff ? xff.split(",")[0]!.trim() : h.get("x-real-ip") ?? "unknown";
}

export async function resendVerificationEmail(
  input: unknown
): Promise<ResendResult> {
  maybeSweep();

  const parsed = InputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid" };

  const ip = await getClientIp();
  const rl = checkRateLimit(`resend:${ip}`, 3, 10 * 60 * 1000);
  if (!rl.allowed) return { ok: false, code: "rate_limited" };

  const supabase = await createClient();
  const h = await headers();
  const origin = h.get("origin") ?? process.env.NEXT_PUBLIC_APP_URL ?? "";

  const { error } = await supabase.auth.resend({
    type: "signup",
    email: parsed.data.email,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=/${parsed.data.locale}/onboarding`,
    },
  });

  if (error) {
    // Don't leak existence of email.
    console.error("[resend] error", error);
  }

  return { ok: true };
}
