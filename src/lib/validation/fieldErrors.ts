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
