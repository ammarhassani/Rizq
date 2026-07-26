import { describe, it, expect, vi } from "vitest";

// quota.ts is a server module; stub its runtime deps so the constant can be
// imported in a node test (nothing here calls getQuotaState()).
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined, set: () => {} }) }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({}) }));

import { FREE_MONTHLY_QUERIES } from "./quota";

describe("free tier quota", () => {
  // Regression guard: the free allowance was 3 while spec-v2 Part IV.1 and the
  // /upgrade page both advertise 5, silently paywalling free users 2 lookups
  // early. The number is a promise made in the UI — it must not drift again.
  it("is 5 lookups per calendar month, as advertised", () => {
    expect(FREE_MONTHLY_QUERIES).toBe(5);
  });
});
