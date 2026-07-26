import { describe, it, expect } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { loadUserBrandDefaults } from "./brand";

/**
 * The freelancer's sign-in address used to be printed on every document their client read,
 * because `contact.email` fell back to `users.email` and then to the auth email. A contact
 * address is something you choose to publish; an authentication address is not.
 */

const AUTH_EMAIL = "someone+rizqpu-9f2@gmail.com";

/** Minimal stand-in for the one query loadUserBrandDefaults runs. */
function fakeSupabase(profile: Record<string, unknown> | null): SupabaseClient {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({ data: profile, error: null }),
        }),
      }),
    }),
  } as unknown as SupabaseClient;
}

describe("loadUserBrandDefaults — contact.email", () => {
  it("uses the contact email the freelancer deliberately set", async () => {
    const brand = await loadUserBrandDefaults(
      fakeSupabase({
        name: "محمد العمري",
        email: "login@example.com",
        contact_email: "hello@omari.sa",
      }),
      "user-1",
      AUTH_EMAIL,
    );
    expect(brand.contact.email).toBe("hello@omari.sa");
  });

  it("is null — never users.email — when no contact email is set", async () => {
    const brand = await loadUserBrandDefaults(
      fakeSupabase({
        name: "محمد العمري",
        email: "login@example.com",
        contact_email: null,
      }),
      "user-1",
      AUTH_EMAIL,
    );
    expect(brand.contact.email).toBeNull();
  });

  it("is null — never the auth email — when the profile row carries no email at all", async () => {
    const brand = await loadUserBrandDefaults(
      fakeSupabase({ name: "محمد العمري" }),
      "user-1",
      AUTH_EMAIL,
    );
    expect(brand.contact.email).toBeNull();
  });

  it("is null when the profile row is missing entirely", async () => {
    const brand = await loadUserBrandDefaults(fakeSupabase(null), "user-1", AUTH_EMAIL);
    expect(brand.contact.email).toBeNull();
  });

  it("still names a nameless freelancer from the auth email (that fallback stays)", async () => {
    // The name has to come from somewhere; it is not an address handed to the client.
    const brand = await loadUserBrandDefaults(fakeSupabase({}), "user-1", AUTH_EMAIL);
    expect(brand.freelancerName).toBe(AUTH_EMAIL);
    expect(brand.contact.email).toBeNull();
  });
});
