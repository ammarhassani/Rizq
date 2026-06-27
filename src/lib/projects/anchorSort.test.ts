import { describe, it, expect } from "vitest";
import { anchorStatusRank, sortAnchorProposals } from "./anchorSort";

describe("anchorStatusRank", () => {
  it("ranks accepted › sent › viewed › draft › other", () => {
    expect(anchorStatusRank("accepted")).toBeLessThan(anchorStatusRank("sent"));
    expect(anchorStatusRank("sent")).toBeLessThan(anchorStatusRank("viewed"));
    expect(anchorStatusRank("viewed")).toBeLessThan(anchorStatusRank("draft"));
    expect(anchorStatusRank("draft")).toBeLessThan(anchorStatusRank("declined"));
    expect(anchorStatusRank("anything-else")).toBe(4);
  });
});

describe("sortAnchorProposals", () => {
  it("orders by status priority then recency (desc)", () => {
    const items = [
      { id: "draft-old", status: "draft", createdAt: "2026-01-01" },
      { id: "sent-new", status: "sent", createdAt: "2026-06-01" },
      { id: "accepted", status: "accepted", createdAt: "2026-03-01" },
      { id: "sent-old", status: "sent", createdAt: "2026-02-01" },
      { id: "draft-new", status: "draft", createdAt: "2026-05-01" },
    ];
    expect(sortAnchorProposals(items).map((i) => i.id)).toEqual([
      "accepted",
      "sent-new",
      "sent-old",
      "draft-new",
      "draft-old",
    ]);
  });
  it("does not mutate the input", () => {
    const items = [{ id: "a", status: "draft", createdAt: "2026-01-01" }];
    const copy = [...items];
    sortAnchorProposals(items);
    expect(items).toEqual(copy);
  });
});
