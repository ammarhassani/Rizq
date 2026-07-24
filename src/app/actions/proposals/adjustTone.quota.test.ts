import { describe, it, expect } from "vitest";
import { countToneUsesSince } from "@/lib/proposals/toneQuota";

const MONTH_START = new Date("2026-07-01T00:00:00.000Z").getTime();
// An EFFECTIVE use = applied_at + non-empty sections_modified.
const use = (d: string) => ({ applied_at: d, sections_modified: ["cover_letter"] });
const noop = (d: string) => ({ applied_at: d, sections_modified: [] });

describe("countToneUsesSince", () => {
  it("counts only effective entries at/after the cutoff, across proposals", () => {
    const rows = [
      { tone_adjustments: [use("2026-07-05"), use("2026-06-28")] }, // 1 in-month
      { tone_adjustments: [use("2026-07-10"), use("2026-07-20")] }, // 2 in-month
    ];
    expect(countToneUsesSince(rows, MONTH_START)).toBe(3);
  });

  it("does NOT count no-op rewrites (empty sections_modified)", () => {
    const rows = [{ tone_adjustments: [use("2026-07-05"), noop("2026-07-06"), noop("2026-07-07")] }];
    expect(countToneUsesSince(rows, MONTH_START)).toBe(1);
  });

  it("ignores prior-month entries entirely", () => {
    const rows = [{ tone_adjustments: [use("2026-06-01"), use("2026-05-15")] }];
    expect(countToneUsesSince(rows, MONTH_START)).toBe(0);
  });

  it("is robust to null / non-array / malformed logs", () => {
    const rows = [
      { tone_adjustments: null },
      { tone_adjustments: "oops" },
      { tone_adjustments: [{ no_applied_at: true }, use("2026-07-09")] },
    ];
    expect(countToneUsesSince(rows, MONTH_START)).toBe(1);
  });

  it("counts an effective entry exactly at the cutoff (>=)", () => {
    const rows = [{ tone_adjustments: [use("2026-07-01T00:00:00.000Z")] }];
    expect(countToneUsesSince(rows, MONTH_START)).toBe(1);
  });
});
