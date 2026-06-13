import { describe, it, expect } from "vitest";
import { isOverdue, daysOverdue } from "./overdue";

// Fixed reference date for all tests — 2026-06-14T00:00:00Z (UTC midnight)
const TODAY = new Date("2026-06-14T00:00:00Z");

// ---------------------------------------------------------------------------
// isOverdue
// ---------------------------------------------------------------------------

describe("isOverdue", () => {
  // ── status gating ────────────────────────────────────────────────────────

  it("returns true for sent + past due date", () => {
    expect(isOverdue("sent", "2026-06-13", TODAY)).toBe(true);
  });

  it("returns true for viewed + past due date", () => {
    expect(isOverdue("viewed", "2026-06-13", TODAY)).toBe(true);
  });

  it("returns false for paid + past due date (paid invoice is never overdue)", () => {
    expect(isOverdue("paid", "2026-06-13", TODAY)).toBe(false);
  });

  it("returns false for draft + past due date", () => {
    expect(isOverdue("draft", "2026-06-13", TODAY)).toBe(false);
  });

  it("returns false for cancelled + past due date", () => {
    expect(isOverdue("cancelled", "2026-06-13", TODAY)).toBe(false);
  });

  it("returns false for overdue (status already set) + past due date", () => {
    // The DB may already flip status to 'overdue'; this function checks the
    // condition, not the historical label.
    expect(isOverdue("overdue", "2026-06-13", TODAY)).toBe(false);
  });

  // ── due date edge cases ───────────────────────────────────────────────────

  it("returns false when due TODAY (not strictly before today)", () => {
    expect(isOverdue("sent", "2026-06-14", TODAY)).toBe(false);
  });

  it("returns false when due date is in the future", () => {
    expect(isOverdue("sent", "2026-06-15", TODAY)).toBe(false);
  });

  it("returns false when dueDate is null (no deadline)", () => {
    expect(isOverdue("sent", null, TODAY)).toBe(false);
  });

  it("returns false when dueDate is an empty string", () => {
    expect(isOverdue("sent", "", TODAY)).toBe(false);
  });

  it("returns false when dueDate is an unparseable string", () => {
    expect(isOverdue("sent", "not-a-date", TODAY)).toBe(false);
  });

  it("returns true for sent + due yesterday (exactly 1 day past)", () => {
    expect(isOverdue("sent", "2026-06-13", TODAY)).toBe(true);
  });

  it("returns true for viewed + due a week ago", () => {
    expect(isOverdue("viewed", "2026-06-07", TODAY)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// daysOverdue
// ---------------------------------------------------------------------------

describe("daysOverdue", () => {
  it("returns 1 when due yesterday", () => {
    expect(daysOverdue("2026-06-13", TODAY)).toBe(1);
  });

  it("returns 0 when due today (not past)", () => {
    expect(daysOverdue("2026-06-14", TODAY)).toBe(0);
  });

  it("returns 0 when due tomorrow (future)", () => {
    expect(daysOverdue("2026-06-15", TODAY)).toBe(0);
  });

  it("returns 7 when due 7 days ago", () => {
    expect(daysOverdue("2026-06-07", TODAY)).toBe(7);
  });

  it("returns 30 when due 30 days ago", () => {
    expect(daysOverdue("2026-05-15", TODAY)).toBe(30);
  });

  it("returns 0 for null dueDate", () => {
    expect(daysOverdue(null, TODAY)).toBe(0);
  });

  it("returns 0 for empty string dueDate", () => {
    expect(daysOverdue("", TODAY)).toBe(0);
  });

  it("returns 0 for unparseable dueDate", () => {
    expect(daysOverdue("not-a-date", TODAY)).toBe(0);
  });
});
