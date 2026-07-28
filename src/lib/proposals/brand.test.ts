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
    );
    expect(brand.contact.email).toBeNull();
  });

  it("is null — never the auth email — when the profile row carries no email at all", async () => {
    const brand = await loadUserBrandDefaults(
      fakeSupabase({ name: "محمد العمري" }),
      "user-1",
    );
    expect(brand.contact.email).toBeNull();
  });

  it("is null when the profile row is missing entirely", async () => {
    const brand = await loadUserBrandDefaults(fakeSupabase(null), "user-1");
    expect(brand.contact.email).toBeNull();
  });

  it("never names a nameless freelancer with an address", async () => {
    // This assertion used to read the other way, on the grounds that a name "is not an
    // address handed to the client". It is: the name is printed on the document, used as
    // the logo's alt text, and carried in the share link's og:title.
    const brand = await loadUserBrandDefaults(fakeSupabase({}), "user-1");
    expect(brand.freelancerName).toBe("مستقل / Freelancer");
    expect(brand.contact.email).toBeNull();
  });

  it("does not use an address stored in name or full_name_ar either", async () => {
    const brand = await loadUserBrandDefaults(
      fakeSupabase({ name: AUTH_EMAIL, full_name_ar: null }),
      "user-1",
    );
    expect(brand.freelancerName).toBe("مستقل / Freelancer");
  });

  it("still uses a real name", async () => {
    const brand = await loadUserBrandDefaults(
      fakeSupabase({ name: "Mohammed", full_name_ar: "محمد العمري" }),
      "user-1",
    );
    expect(brand.freelancerName).toBe("محمد العمري");
  });
});
