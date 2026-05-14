"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, maybeSweep } from "@/lib/rateLimit";

const InputSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(320),
  password: z.string().min(1).max(72),
});

export type LoginResult =
  | { ok: true }
  | {
      ok: false;
      code: "invalid_credentials" | "email_not_confirmed" | "rate_limited" | "invalid" | "error";
    };

async function getClientIp(): Promise<string> {
  const h = await headers();
  const xff = h.get("x-forwarded-for");
  return xff ? xff.split(",")[0]!.trim() : h.get("x-real-ip") ?? "unknown";
}

export async function logIn(input: unknown): Promise<LoginResult> {
  maybeSweep();

  const parsed = InputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid" };

  const ip = await getClientIp();
  const rl = checkRateLimit(`login:${ip}`, 10, 5 * 60 * 1000);
  if (!rl.allowed) return { ok: false, code: "rate_limited" };

  const supabase = await createClient();
  const { data: signInData, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("email not confirmed") || msg.includes("not confirmed")) {
      return { ok: false, code: "email_not_confirmed" };
    }
    if (msg.includes("invalid login") || msg.includes("invalid credentials")) {
      return { ok: false, code: "invalid_credentials" };
    }
    if (msg.includes("rate limit") || msg.includes("too many")) {
      return { ok: false, code: "rate_limited" };
    }
    // Don't leak email or full error message to logs.
    console.error("[login] error", { code: error.code });
    return { ok: false, code: "error" };
  }

  // Use the user returned from signInWithPassword directly — avoids a
  // second getUser() round-trip and the race window between the two.
  const userId = signInData?.user?.id;
  if (userId) {
    await supabase
      .from("users")
      .update({ last_active: new Date().toISOString() })
      .eq("id", userId);
  }

  return { ok: true };
}
