import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * "حدث خطأ. حاول مرة أخرى." for a malformed email sends the freelancer round a loop that
 * can never succeed. The failure must name the email field instead.
 *
 * Contract: specs/011-power-user-pass-3/contracts/validation-errors.md
 */

const state = {
  user: { id: "user-1" } as { id: string } | null,
  insertError: null as { code: string; message: string } | null,
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: state.user } }) },
    from: () => ({
      insert: () => ({
        select: () => ({
          single: async () => ({
            data: state.insertError ? null : { id: "client-1" },
            error: state.insertError,
          }),
        }),
      }),
      update: () => ({
        eq: () => ({ eq: async () => ({ error: state.insertError }) }),
      }),
    }),
  }),
}));

vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));

const { createClient, updateClient } = await import("./clients");

beforeEach(() => {
  state.user = { id: "user-1" };
  state.insertError = null;
});

const validClient = { name: "شركة الأفق" };

describe("createClient — validation failures name their field", () => {
  it("names the email field for a malformed address", async () => {
    const result = await createClient({ ...validClient, email: "not-an-email" });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("invalid");
    expect(result.fields).toEqual([{ field: "email", reason: "invalid_email" }]);
  });

  it("names the name field when it is empty", async () => {
    const result = await createClient({ name: "" });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.fields).toEqual([{ field: "name", reason: "required" }]);
  });

  it("names the rating field when it is out of range", async () => {
    const result = await createClient({ ...validClient, rating: 9 });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.fields?.[0].field).toBe("rating");
  });

  it("succeeds on a valid payload", async () => {
    const result = await createClient({ ...validClient, email: "hi@ufuq.sa" });
    expect(result).toEqual({ ok: true, id: "client-1" });
  });

  it("accepts an empty email (the field is optional)", async () => {
    const result = await createClient({ ...validClient, email: "" });
    expect(result.ok).toBe(true);
  });

  it("keeps its own code for a lost session — not a field error", async () => {
    state.user = null;
    const result = await createClient(validClient);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("unauthorized");
    expect(result.fields).toBeUndefined();
  });

  it("keeps its own code for a database failure — retry copy belongs here", async () => {
    state.insertError = { code: "08006", message: "connection lost" };
    const result = await createClient(validClient);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("error");
    expect(result.fields).toBeUndefined();
  });
});

describe("updateClient — validation failures name their field", () => {
  it("strips the patch. wrapper so the key matches the rendered input", async () => {
    const result = await updateClient({
      id: "11111111-1111-4111-8111-111111111111",
      patch: { email: "not-an-email" },
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.fields).toEqual([{ field: "email", reason: "invalid_email" }]);
  });

  it("succeeds on a valid patch", async () => {
    const result = await updateClient({
      id: "11111111-1111-4111-8111-111111111111",
      patch: { email: "hi@ufuq.sa" },
    });
    expect(result).toEqual({ ok: true });
  });
});
