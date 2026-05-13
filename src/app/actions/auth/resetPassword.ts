"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const InputSchema = z.object({
  password: z.string().min(8).max(72),
});

export type ResetPasswordResult =
  | { ok: true }
  | { ok: false; code: "invalid" | "no_session" | "weak_password" | "error" };

export async function setNewPassword(
  input: unknown
): Promise<ResetPasswordResult> {
  const parsed = InputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid" };

  const supabase = await createClient();

  // The /auth/callback handler has exchanged the recovery token for a session.
  // That session is what authorizes the password update below.
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, code: "no_session" };

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("weak") || msg.includes("password should")) {
      return { ok: false, code: "weak_password" };
    }
    console.error("[reset-password] error", error);
    return { ok: false, code: "error" };
  }

  return { ok: true };
}
