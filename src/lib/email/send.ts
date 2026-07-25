import "server-only";

/**
 * Transactional email via Resend.
 *
 * Uses Resend's REST endpoint through `fetch` rather than the `resend` package —
 * it is one POST, so a dependency would buy nothing and add version churn.
 *
 * Configuration (both required for sending to actually happen):
 *   RESEND_API_KEY  — from the Resend dashboard
 *   RESEND_FROM     — a verified sender, e.g. "Rizq <invoices@rizq.sa>"
 *
 * Every AI/PDPL rule that applies elsewhere applies here: we only ever send to an
 * address the freelancer entered for their own client, and the body carries no
 * data the recipient shouldn't already have.
 */

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  /** Replies should reach the freelancer, not a no-reply mailbox. */
  replyTo?: string;
};

export type SendEmailResult =
  | { ok: true; id: string }
  | { ok: false; code: "not_configured" | "invalid" | "error"; message?: string };

/**
 * Whether email is wired up in this runtime. Callers check this to degrade
 * gracefully — the UI hides/disables "send by email" instead of offering a
 * button that silently does nothing (Principle I: don't claim what we can't do).
 */
export function isEmailConfigured(): boolean {
  return (
    (process.env.RESEND_API_KEY ?? "").trim().length > 0 &&
    (process.env.RESEND_FROM ?? "").trim().length > 0
  );
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const apiKey = (process.env.RESEND_API_KEY ?? "").trim();
  const from = (process.env.RESEND_FROM ?? "").trim();
  if (!apiKey || !from) return { ok: false, code: "not_configured" };
  if (!EMAIL_RE.test(input.to)) return { ok: false, code: "invalid" };

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [input.to],
        subject: input.subject,
        html: input.html,
        ...(input.replyTo ? { reply_to: input.replyTo } : {}),
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      // Log the status/body server-side; never leak provider detail to the client.
      const body = await res.text().catch(() => "");
      console.error("[sendEmail] resend rejected", res.status, body.slice(0, 300));
      return { ok: false, code: "error" };
    }

    const data = (await res.json().catch(() => null)) as { id?: string } | null;
    return { ok: true, id: data?.id ?? "" };
  } catch (err) {
    console.error("[sendEmail] failed", err);
    return { ok: false, code: "error" };
  }
}
