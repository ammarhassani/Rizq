import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * A validation failure is permanent — retrying an unchanged value can never succeed. The
 * action must therefore say WHICH field and WHY, and must keep the generic `error` code for
 * failures that a retry might actually fix.
 *
 * Contract: specs/011-power-user-pass-3/contracts/validation-errors.md
 */

const state = {
  user: { id: "user-1" } as { id: string } | null,
  updateError: null as { code: string } | null,
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: state.user } }) },
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: { onboarding_step: 1 }, error: null }),
        }),
      }),
      update: () => ({
        eq: async () => ({ error: state.updateError }),
      }),
    }),
  }),
}));

const { saveOnboardingStep } = await import("./saveOnboardingStep");

beforeEach(() => {
  state.user = { id: "user-1" };
  state.updateError = null;
});

describe("saveOnboardingStep — validation failures name their field", () => {
  it("reports a malformed URL as an invalid_url on that field, not a generic error", async () => {
    const result = await saveOnboardingStep("platforms", {
      bahr_profile_url: "not a url",
      linkedin_url: "https://linkedin.com/in/omari",
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("invalid");
    expect(result.fields).toEqual([
      { field: "bahr_profile_url", reason: "invalid_url" },
    ]);
  });

  it("rejects an unsupported scheme instead of accepting it and storing nothing", async () => {
    // Zod's .url() accepts javascript: — the allow-list is what catches it, and the
    // rejection must be reported rather than silently dropped (FR-011).
    const result = await saveOnboardingStep("platforms", {
      personal_website_url: "javascript:alert(1)",
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("invalid");
    expect(result.fields).toEqual([
      { field: "personal_website_url", reason: "unsupported_scheme" },
    ]);
  });

  it("rejects a data: URL the same way", async () => {
    const result = await saveOnboardingStep("platforms", {
      behance_url: "data:text/html,<b>hi</b>",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.fields?.[0]).toEqual({
      field: "behance_url",
      reason: "unsupported_scheme",
    });
  });

  it("accepts a valid https link", async () => {
    const result = await saveOnboardingStep("platforms", {
      mostaql_profile_url: "https://mostaql.com/u/omari",
    });
    expect(result.ok).toBe(true);
  });

  it("keeps its own code for a lost session — not a field error", async () => {
    state.user = null;
    const result = await saveOnboardingStep("platforms", {
      linkedin_url: "https://linkedin.com/in/omari",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("no_session");
    expect(result.fields).toBeUndefined();
  });

  it("keeps its own code for a database failure — retry copy belongs here", async () => {
    state.updateError = { code: "08006" };
    const result = await saveOnboardingStep("platforms", {
      linkedin_url: "https://linkedin.com/in/omari",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("error");
    expect(result.fields).toBeUndefined();
  });

  it("keeps its own code for an unknown step", async () => {
    const result = await saveOnboardingStep("not_a_step", {});
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("unknown_step");
  });
});
