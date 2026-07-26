import { describe, it, expect } from "vitest";
import {
  PROPOSAL_STATUSES,
  proposalStatusClass,
  proposalStatusLabel,
} from "./proposalStatus";

describe("proposalStatusLabel", () => {
  it("gives every status a real English label — never the raw DB enum", () => {
    for (const status of PROPOSAL_STATUSES) {
      const label = proposalStatusLabel(status, "en");
      expect(label).not.toBe(status); // raw enum leaked
      expect(label).toMatch(/^[A-Z]/); // reads as a word, not an identifier
    }
  });

  it("gives every status an Arabic label (no Latin characters)", () => {
    for (const status of PROPOSAL_STATUSES) {
      const label = proposalStatusLabel(status, "ar");
      expect(label).not.toBe(status);
      expect(label).not.toMatch(/[A-Za-z]/);
    }
  });

  it("humanizes an unknown/new enum instead of leaking it", () => {
    expect(proposalStatusLabel("archived", "en")).toBe("Archived");
    expect(proposalStatusLabel("archived", "ar")).toBe("Archived");
    expect(proposalStatusLabel("", "en")).toBe("");
  });

  it("falls back to a neutral pill class for an unknown status", () => {
    expect(proposalStatusClass("accepted")).toBe("status-positive");
    expect(proposalStatusClass("archived")).toBe("status-neutral");
  });
});
