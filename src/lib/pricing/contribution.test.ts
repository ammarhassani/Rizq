import { describe, it, expect } from "vitest";
import { projectSizeFromDeliverables, applyKAnonymity, SUBMITTED_K_ANON } from "./contribution";

describe("projectSizeFromDeliverables", () => {
  it("buckets by deliverable count", () => {
    expect(projectSizeFromDeliverables(null)).toBe("small");
    expect(projectSizeFromDeliverables(1)).toBe("small");
    expect(projectSizeFromDeliverables(2)).toBe("medium");
    expect(projectSizeFromDeliverables(3)).toBe("medium");
    expect(projectSizeFromDeliverables(4)).toBe("large");
    expect(projectSizeFromDeliverables(6)).toBe("large");
    expect(projectSizeFromDeliverables(7)).toBe("enterprise");
    expect(projectSizeFromDeliverables(20)).toBe("enterprise");
  });
});

describe("applyKAnonymity", () => {
  const sub = (u: string) => ({ provenance: "submitted", source_user_id: u });
  const pub = { provenance: "published_ref", source_user_id: null };

  it("drops submitted rows from < K distinct contributors", () => {
    const rows = [sub("a"), sub("a"), pub];
    expect(applyKAnonymity(rows)).toEqual([pub]);
  });
  it("keeps submitted rows once K distinct contributors are present", () => {
    const rows = [sub("a"), sub("b"), sub("c"), pub];
    expect(applyKAnonymity(rows)).toHaveLength(4);
  });
  it("passes through when there are no submitted rows", () => {
    const rows = [pub, { provenance: "reasoned", source_user_id: null }];
    expect(applyKAnonymity(rows)).toEqual(rows);
  });
  it("ignores blank user ids when counting distinct contributors", () => {
    const rows = [sub(""), sub(""), sub("")];
    expect(applyKAnonymity(rows)).toEqual([]); // 0 distinct (blank) → dropped
  });
  it(`K is ${SUBMITTED_K_ANON}`, () => {
    expect(SUBMITTED_K_ANON).toBe(3);
  });
});
