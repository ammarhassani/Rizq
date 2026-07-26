import { describe, it, expect } from "vitest";
import { z } from "zod";
import {
  urlProblem,
  isSupportedUrl,
  PROFILE_URL,
  fieldErrorsFromZod,
} from "./fieldErrors";

/**
 * The form and the server action must agree about every link, exactly.
 *
 * They did not: `new URL("https://not a url at all")` parses, Zod's `.url()` does not. The
 * form vouched for the value and submitted it; the action rejected the whole step and the
 * valid links typed alongside it were never saved, with nothing on screen saying so.
 */

const ACCEPTED = [
  "https://linkedin.com/in/sara",
  "http://example.com",
  "https://mostaql.com/u/omari?tab=portfolio",
  "https://بحر.سا/profile",
];

const REJECTED: Array<[string, string]> = [
  ["not a url at all", "invalid_url"],
  // Browsers percent-encode the spaces INTO the hostname and hand back a URL that Zod's
  // .url() accepts. Node rejects the same input. The rule must not depend on which one ran.
  ["https://not a url at all", "invalid_url"],
  ["https://not%20a%20url%20at%20all/", "invalid_url"],
  ["https://localhost", "invalid_url"],
  ["https://", "invalid_url"],
  ["", "invalid_url"],
  ["javascript:alert(1)", "unsupported_scheme"],
  ["JavaScript:alert(1)", "unsupported_scheme"],
  ["data:text/html,<b>x</b>", "unsupported_scheme"],
  ["file:///etc/passwd", "unsupported_scheme"],
  [`https://example.com/${"x".repeat(600)}`, "too_long"],
];

describe("urlProblem is the single source of truth for a profile link", () => {
  for (const value of ACCEPTED) {
    it(`accepts ${value}`, () => {
      expect(urlProblem(value)).toBeNull();
      expect(PROFILE_URL.safeParse(value).success).toBe(true);
    });
  }

  for (const [value, reason] of REJECTED) {
    it(`rejects ${JSON.stringify(value).slice(0, 42)} as ${reason}`, () => {
      expect(urlProblem(value)).toBe(reason);
      expect(PROFILE_URL.safeParse(value).success).toBe(false);
    });
  }

  it("never disagrees with the schema the server actually runs", () => {
    // The form omits a field from the payload exactly when urlProblem returns non-null.
    // If the schema were stricter than that, the server would throw out the whole step.
    const serverField = PROFILE_URL.optional().nullable().or(z.literal(""));
    for (const value of [...ACCEPTED, ...REJECTED.map(([v]) => v)]) {
      const formWouldSend = urlProblem(value) === null;
      const serverAccepts = serverField.safeParse(value).success;
      expect(
        !formWouldSend || serverAccepts,
        `the form would submit ${JSON.stringify(value)} but the action rejects it`,
      ).toBe(true);
    }
  });

  it("still lets an empty field through as a deliberate clear", () => {
    const serverField = PROFILE_URL.optional().nullable().or(z.literal(""));
    expect(serverField.safeParse("").success).toBe(true);
    expect(serverField.safeParse(null).success).toBe(true);
  });
});

describe("isSupportedUrl", () => {
  it("allows only http and https", () => {
    expect(isSupportedUrl("http://x.com")).toBe(true);
    expect(isSupportedUrl("https://x.com")).toBe(true);
    expect(isSupportedUrl("javascript:alert(1)")).toBe(false);
    expect(isSupportedUrl("data:text/plain,x")).toBe(false);
    expect(isSupportedUrl("ftp://x.com")).toBe(false);
    expect(isSupportedUrl("nonsense")).toBe(false);
  });
});

describe("fieldErrorsFromZod", () => {
  const Schema = z.object({
    email: z.string().email(),
    name: z.string().min(1),
    patch: z.object({ phone: z.string().max(3) }),
  });

  it("names each failing field once, with a translatable reason", () => {
    const parsed = Schema.safeParse({ email: "nope", name: "", patch: { phone: "toolong" } });
    expect(parsed.success).toBe(false);
    if (parsed.success) return;
    expect(fieldErrorsFromZod(parsed.error)).toEqual([
      { field: "email", reason: "invalid_email" },
      { field: "name", reason: "required" },
      { field: "patch.phone", reason: "too_long" },
    ]);
  });

  it("strips a wrapper prefix so the key matches the rendered input", () => {
    const parsed = Schema.safeParse({ email: "a@b.co", name: "x", patch: { phone: "toolong" } });
    if (parsed.success) throw new Error("expected a failure");
    expect(fieldErrorsFromZod(parsed.error, "patch.")).toEqual([
      { field: "phone", reason: "too_long" },
    ]);
  });
});
