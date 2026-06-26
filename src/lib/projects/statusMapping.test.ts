import { describe, it, expect } from "vitest";
import { gigStatusToProjectStatus } from "./statusMapping";
import type { GigStatus } from "./types";

describe("gigStatusToProjectStatus", () => {
  it("maps paid → completed", () => {
    expect(gigStatusToProjectStatus("paid")).toBe("completed");
  });

  it("maps cancelled → cancelled", () => {
    expect(gigStatusToProjectStatus("cancelled")).toBe("cancelled");
  });

  it.each<GigStatus>(["pending", "deposit_paid", "in_progress", "delivered", "overdue"])(
    "maps live status %s → active",
    (s) => {
      expect(gigStatusToProjectStatus(s)).toBe("active");
    }
  );

  it("defaults unknown/null/undefined → active (never throws)", () => {
    expect(gigStatusToProjectStatus(null)).toBe("active");
    expect(gigStatusToProjectStatus(undefined)).toBe("active");
    expect(gigStatusToProjectStatus("something_new")).toBe("active");
  });

  it("covers every known gig_status value", () => {
    const all: GigStatus[] = [
      "pending",
      "deposit_paid",
      "in_progress",
      "delivered",
      "paid",
      "overdue",
      "cancelled",
    ];
    for (const s of all) {
      expect(["active", "completed", "cancelled"]).toContain(gigStatusToProjectStatus(s));
    }
  });
});
