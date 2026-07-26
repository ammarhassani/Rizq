/**
 * Server-action validation failures the form can act on.
 *
 * A validation failure is permanent: the value cannot be accepted as typed, ever. Rendering
 * it as "something went wrong, try again" sends the freelancer round a loop that can never
 * succeed and never names what to change. So a failed parse carries the field that failed
 * and an enumerated reason the catalogue translates.
 *
 * PURE. Contract: specs/011-power-user-pass-3/contracts/validation-errors.md
 */

import { z } from "zod";
import type { ZodError } from "zod";

export type FieldErrorReason =
  | "required"
  | "invalid_url"
  | "unsupported_scheme"
  | "invalid_email"
  | "invalid_phone"
  | "too_long"
  | "invalid";

export type FieldError = { field: string; reason: FieldErrorReason };

/**
 * Schemes a link published on a freelancer's profile may use.
 *
 * Zod's `.url()` accepts `javascript:` and `data:` — it only asks whether the string parses
 * as a URL. The allow-list lives here, server-side, because the server is the trust
 * boundary; the client mirrors it for immediate feedback.
 */
export const SUPPORTED_URL_SCHEMES = ["http:", "https:"] as const;

export function isSupportedUrl(value: string): boolean {
  try {
    const { protocol } = new URL(value);
    return (SUPPORTED_URL_SCHEMES as readonly string[]).includes(protocol);
  } catch {
    return false;
  }
}

/**
 * What is wrong with a link the freelancer wants on their profile, or null when nothing is.
 *
 * Deliberately NOT Zod's `.url()`. Browsers percent-encode whitespace into the hostname, so
 * `new URL("https://not a url at all")` yields `https://not%20a%20url%20at%20all/`, which
 * that check then accepts — while the same input is rejected under Node. The form vouched
 * for the value, submitted it, and the action threw out the whole step, silently discarding
 * the valid links typed beside it.
 *
 * This rule reads the PARSED parts, so it returns the same verdict in every runtime.
 */
function urlShape(value: string): FieldErrorReason | null {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return "invalid_url";
  }

  if (!(SUPPORTED_URL_SCHEMES as readonly string[]).includes(url.protocol)) {
    return "unsupported_scheme";
  }

  // A real host: no encoded whitespace, and at least two non-empty labels.
  const host = url.hostname;
  if (!host || host.includes("%")) return "invalid_url";
  const labels = host.split(".");
  if (labels.length < 2 || labels.some((label) => label.length === 0)) return "invalid_url";

  return null;
}

/**
 * THE link validator. The server schema and the form run this same rule, because a form that
 * vouches for a value the action rejects costs the freelancer everything they typed with it.
 */
export const PROFILE_URL = z
  .string()
  .max(500)
  .superRefine((value, ctx) => {
    const problem = urlShape(value);
    if (problem) ctx.addIssue({ code: "custom", message: problem });
  });

/** Why this link cannot be saved, or null when it can. Same verdict on both sides. */
export function urlProblem(value: string): FieldErrorReason | null {
  const parsed = PROFILE_URL.safeParse(value);
  if (parsed.success) return null;
  return reasonFromIssue(parsed.error.issues[0]);
}

const KNOWN_REASONS = new Set<string>([
  "required",
  "invalid_url",
  "unsupported_scheme",
  "invalid_email",
  "invalid_phone",
  "too_long",
  "invalid",
]);

/** Reason codes are raised from a schema via `{ error: "<reason>" }` on a refine/check. */
function reasonFromIssue(issue: ZodError["issues"][number]): FieldErrorReason {
  // A custom check states its own reason in the message.
  if (KNOWN_REASONS.has(issue.message)) return issue.message as FieldErrorReason;

  switch (issue.code) {
    case "invalid_format": {
      const format = (issue as { format?: string }).format;
      if (format === "url") return "invalid_url";
      if (format === "email") return "invalid_email";
      return "invalid";
    }
    case "too_small":
      return "required";
    case "too_big":
      return "too_long";
    default:
      return "invalid";
  }
}

/**
 * Flatten a Zod failure into field/reason pairs, first issue per field.
 *
 * @param stripPrefix removes a wrapper path segment (e.g. "patch.") so the key matches the
 *                    input name the form actually renders.
 */
export function fieldErrorsFromZod(error: ZodError, stripPrefix = ""): FieldError[] {
  const seen = new Set<string>();
  const out: FieldError[] = [];

  for (const issue of error.issues) {
    let field = issue.path.map(String).join(".");
    if (stripPrefix && field.startsWith(stripPrefix)) {
      field = field.slice(stripPrefix.length);
    }
    // An issue with no path cannot name a field; per the contract that is a transient
    // report, not a field error, so it is dropped here rather than guessed at.
    if (!field || seen.has(field)) continue;
    seen.add(field);
    out.push({ field, reason: reasonFromIssue(issue) });
  }

  return out;
}
