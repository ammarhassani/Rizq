/**
 * Unit tests for calculateHadafStatus — pure calculator, clock-injected.
 * Edge cases covered:
 * - 1-month qualifying streak
 * - 2-month qualifying streak
 * - 3-month qualifying streak (fully eligible)
 * - Broken streak (gap month in the middle)
 * - Exactly at 700 SAR boundary (qualifies)
 * - Below 700 SAR (does not qualify)
 * - No income data → no_data status
 * - Subsidy math with and without cap
 * - 12-month window trimming (data older than 12 months ignored in history)
 * - Current month not-yet-qualifying (streak broken, streak=0)
 * - Multiple income rows for the same month are summed
 * - Streak is 0 when current month does not qualify
 */

import { describe, it, expect } from "vitest";
import { calculateHadafStatus } from "./calculate";
import type { HadafRules, MonthIncome } from "./calculate";

const BASE_RULES: HadafRules = {
  platform: "bahr",
  minimum_monthly_income_sar: 700,
  consecutive_months_required: 3,
  subsidy_pct: 40,
  max_subsidy_sar: null,
};

// Fixed clock: June 14 2026
const TODAY = new Date(2026, 5, 14); // month is 0-indexed → June

// Helper: build a MonthIncome array from a map { "YYYY-MM": income }
function mi(entries: Record<string, number>): MonthIncome[] {
  return Object.entries(entries).map(([month, income]) => ({ month, income }));
}

// ─── No data ─────────────────────────────────────────────────────────────────

describe("no income data", () => {
  it("returns no_data status with zeros when there are no income rows", () => {
    const result = calculateHadafStatus(BASE_RULES, [], TODAY);
    expect(result.current_month_status).toBe("no_data");
    expect(result.current_streak).toBe(0);
    expect(result.current_month_income).toBe(0);
    expect(result.months_to_qualify).toBe(3);
    expect(result.estimated_subsidy).toBeNull();
    expect(result.streak_history).toHaveLength(0);
  });
});

// ─── Below threshold ──────────────────────────────────────────────────────────

describe("below 700 SAR threshold", () => {
  it("returns not_qualifying and streak=0 when current month is below threshold", () => {
    const result = calculateHadafStatus(
      BASE_RULES,
      mi({ "2026-06": 500, "2026-05": 800, "2026-04": 900 }),
      TODAY
    );
    expect(result.current_month_status).toBe("not_qualifying");
    expect(result.current_streak).toBe(0);
    expect(result.months_to_qualify).toBe(3);
    expect(result.estimated_subsidy).toBeNull();
  });

  it("returns streak=0 when only current month is below threshold with many prior qualifying months", () => {
    const result = calculateHadafStatus(
      BASE_RULES,
      mi({
        "2026-06": 100, // below — breaks streak
        "2026-05": 800,
        "2026-04": 850,
        "2026-03": 900,
      }),
      TODAY
    );
    expect(result.current_streak).toBe(0);
    expect(result.estimated_subsidy).toBeNull();
  });
});

// ─── Exactly at 700 SAR boundary ─────────────────────────────────────────────

describe("at exactly 700 SAR boundary", () => {
  it("qualifies when income is exactly 700 (>= threshold)", () => {
    const result = calculateHadafStatus(
      BASE_RULES,
      mi({ "2026-06": 700, "2026-05": 700, "2026-04": 700 }),
      TODAY
    );
    expect(result.current_month_status).toBe("qualifying");
    expect(result.current_streak).toBe(3);
    expect(result.months_to_qualify).toBe(0);
  });

  it("does NOT qualify when income is 699 (below threshold)", () => {
    const result = calculateHadafStatus(
      BASE_RULES,
      mi({ "2026-06": 699 }),
      TODAY
    );
    expect(result.current_month_status).toBe("not_qualifying");
  });
});

// ─── 1-month streak ───────────────────────────────────────────────────────────

describe("1-month qualifying streak", () => {
  it("returns streak=1 and months_to_qualify=2 when only current month qualifies", () => {
    const result = calculateHadafStatus(
      BASE_RULES,
      mi({ "2026-06": 800, "2026-05": 300, "2026-04": 0 }),
      TODAY
    );
    expect(result.current_streak).toBe(1);
    expect(result.months_to_qualify).toBe(2);
    expect(result.current_month_status).toBe("qualifying");
  });

  it("computes subsidy on single qualifying month income", () => {
    const result = calculateHadafStatus(
      BASE_RULES,
      mi({ "2026-06": 1000 }),
      TODAY
    );
    expect(result.current_streak).toBe(1);
    // subsidy = round(1000 * 40/100, 2) = 400
    expect(result.estimated_subsidy).toBeCloseTo(400, 2);
  });
});

// ─── 2-month streak ───────────────────────────────────────────────────────────

describe("2-month qualifying streak", () => {
  it("returns streak=2 and months_to_qualify=1", () => {
    const result = calculateHadafStatus(
      BASE_RULES,
      mi({ "2026-06": 800, "2026-05": 900, "2026-04": 200 }),
      TODAY
    );
    expect(result.current_streak).toBe(2);
    expect(result.months_to_qualify).toBe(1);
  });

  it("computes subsidy as avg of 2 qualifying months × 40%", () => {
    const result = calculateHadafStatus(
      BASE_RULES,
      mi({ "2026-06": 1000, "2026-05": 2000 }),
      TODAY
    );
    // avg = (1000 + 2000) / 2 = 1500; subsidy = 1500 * 0.4 = 600
    expect(result.estimated_subsidy).toBeCloseTo(600, 2);
  });
});

// ─── 3-month streak (fully eligible) ─────────────────────────────────────────

describe("3-month qualifying streak (fully eligible)", () => {
  it("returns streak=3 and months_to_qualify=0", () => {
    const result = calculateHadafStatus(
      BASE_RULES,
      mi({ "2026-06": 800, "2026-05": 900, "2026-04": 1000 }),
      TODAY
    );
    expect(result.current_streak).toBe(3);
    expect(result.months_to_qualify).toBe(0);
    expect(result.current_month_status).toBe("qualifying");
  });

  it("computes subsidy as avg of 3 qualifying months × 40%", () => {
    const result = calculateHadafStatus(
      BASE_RULES,
      mi({ "2026-06": 800, "2026-05": 1000, "2026-04": 1200 }),
      TODAY
    );
    // avg = (800 + 1000 + 1200) / 3 = 1000; subsidy = 400
    expect(result.estimated_subsidy).toBeCloseTo(400, 2);
  });

  it("months_to_qualify does not go below 0", () => {
    const result = calculateHadafStatus(
      BASE_RULES,
      mi({ "2026-06": 900, "2026-05": 850, "2026-04": 800, "2026-03": 750 }),
      TODAY
    );
    expect(result.months_to_qualify).toBe(0);
  });
});

// ─── Broken streak (gap month) ────────────────────────────────────────────────

describe("broken streak (gap month)", () => {
  it("resets streak to 1 when there is a gap month below threshold", () => {
    const result = calculateHadafStatus(
      BASE_RULES,
      mi({
        "2026-06": 900, // qualifies
        "2026-05": 300, // below — breaks streak
        "2026-04": 800, // qualifies but disconnected
        "2026-03": 800,
      }),
      TODAY
    );
    expect(result.current_streak).toBe(1);
    expect(result.months_to_qualify).toBe(2);
  });

  it("resets streak to 2 after one good + one gap + two good", () => {
    const result = calculateHadafStatus(
      BASE_RULES,
      mi({
        "2026-06": 900,
        "2026-05": 800,
        "2026-04": 100, // gap
        "2026-03": 900,
      }),
      TODAY
    );
    expect(result.current_streak).toBe(2);
  });
});

// ─── Subsidy cap ─────────────────────────────────────────────────────────────

describe("subsidy cap", () => {
  it("caps subsidy at max_subsidy_sar when set", () => {
    const rulesWithCap: HadafRules = { ...BASE_RULES, max_subsidy_sar: 300 };
    const result = calculateHadafStatus(
      rulesWithCap,
      mi({ "2026-06": 2000, "2026-05": 2000, "2026-04": 2000 }),
      TODAY
    );
    // uncapped: 2000 * 40% = 800; capped at 300
    expect(result.estimated_subsidy).toBe(300);
  });

  it("does not cap when max_subsidy_sar is null", () => {
    const result = calculateHadafStatus(
      BASE_RULES,
      mi({ "2026-06": 2000, "2026-05": 2000, "2026-04": 2000 }),
      TODAY
    );
    expect(result.estimated_subsidy).toBeCloseTo(800, 2);
  });
});

// ─── 12-month window trimming ────────────────────────────────────────────────

describe("12-month window trimming", () => {
  it("does not include months older than 12 months in streak_history", () => {
    // Window = last 12 months including current → start = currentMonth - 11 = 2025-07
    // "2025-06" is 12 months before 2026-06 → OUTSIDE the 12-month window (window start = 2025-07)
    // "2025-07" is 11 months before → first month in the window
    const result = calculateHadafStatus(
      BASE_RULES,
      mi({
        "2025-06": 9999, // 12 months ago — outside the 11-back window, should NOT appear
        "2025-07": 800,  // 11 months ago — first month in the window
        "2026-06": 800,
      }),
      TODAY
    );
    expect(result.streak_history).toHaveLength(12);
    const months = result.streak_history.map((h) => h.month);
    expect(months).not.toContain("2025-06");
    expect(months).toContain("2025-07");
    expect(months[0]).toBe("2025-07"); // window start is currentMonth - 11
  });

  it("streak does not count months outside the 12-month window even if they qualify", () => {
    // 2025-06 is outside the window (window starts at 2025-07), so it should not contribute to streak.
    // Only 2026-06 is inside the window and qualifies.
    const result = calculateHadafStatus(
      BASE_RULES,
      mi({ "2025-06": 9999, "2026-06": 800 }),
      TODAY
    );
    // streak = 1 (only current month inside window qualifies; 2025-06 is outside window)
    expect(result.current_streak).toBe(1);
  });
});

// ─── streak_history correctness ───────────────────────────────────────────────

describe("streak_history", () => {
  it("always returns exactly 12 entries when income data exists", () => {
    const result = calculateHadafStatus(
      BASE_RULES,
      mi({ "2026-06": 800 }),
      TODAY
    );
    expect(result.streak_history).toHaveLength(12);
  });

  it("marks qualifying=false for months with income=0 (no data for that month)", () => {
    const result = calculateHadafStatus(
      BASE_RULES,
      mi({ "2026-06": 800 }),
      TODAY
    );
    // All months except June should have income=0 and qualifying=false
    const nonJune = result.streak_history.filter((h) => h.month !== "2026-06");
    expect(nonJune.every((h) => !h.qualifying)).toBe(true);
  });

  it("is in chronological order (oldest first)", () => {
    const result = calculateHadafStatus(
      BASE_RULES,
      mi({ "2026-06": 800, "2026-04": 900 }),
      TODAY
    );
    const months = result.streak_history.map((h) => h.month);
    for (let i = 1; i < months.length; i++) {
      expect(months[i] > months[i - 1]).toBe(true);
    }
    expect(months[months.length - 1]).toBe("2026-06");
  });
});

// ─── current_month_income ────────────────────────────────────────────────────

describe("current_month_income", () => {
  it("returns 0 when no income for current month but other months have income", () => {
    const result = calculateHadafStatus(
      BASE_RULES,
      mi({ "2026-05": 1200 }),
      TODAY
    );
    expect(result.current_month_income).toBe(0);
    expect(result.current_month_status).toBe("not_qualifying");
  });

  it("sums multiple income rows for the same month", () => {
    const result = calculateHadafStatus(
      BASE_RULES,
      [
        { month: "2026-06", income: 400 },
        { month: "2026-06", income: 400 },
      ],
      TODAY
    );
    expect(result.current_month_income).toBe(800);
    expect(result.current_month_status).toBe("qualifying");
  });
});

// ─── subsidy precision ────────────────────────────────────────────────────────

describe("subsidy precision", () => {
  it("rounds subsidy to 2 decimal places", () => {
    // income = 1001 SAR for 1 month; subsidy = round(1001 * 0.4, 2) = 400.40
    const result = calculateHadafStatus(
      BASE_RULES,
      mi({ "2026-06": 1001 }),
      TODAY
    );
    expect(result.estimated_subsidy).toBeCloseTo(400.4, 2);
  });

  it("returns null estimated_subsidy when streak is 0", () => {
    const result = calculateHadafStatus(
      BASE_RULES,
      mi({ "2026-06": 300 }),
      TODAY
    );
    expect(result.estimated_subsidy).toBeNull();
  });
});
