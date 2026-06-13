import { describe, it, expect } from "vitest";
import {
  groupAgenda,
  eventsForMonth,
  monthGridDays,
  type CalendarEvent,
} from "./group";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeEvent(overrides: Partial<CalendarEvent> & { event_date: string }): CalendarEvent {
  return {
    event_id: "test-id",
    event_type: "gig_delivery",
    user_id: "user-1",
    client_id: null,
    title_ar: "مشروع",
    title_en: "Project",
    status: "pending",
    source_module: "gig",
    source_id: "src-1",
    metadata: {},
    ...overrides,
  };
}

// Fixed "today" for all tests: 2026-06-14 (Sunday)
const TODAY = new Date(2026, 5, 14); // month is 0-indexed

// ─── groupAgenda ──────────────────────────────────────────────────────────────

describe("groupAgenda", () => {
  it("puts an event on today's date in the today bucket", () => {
    const ev = makeEvent({ event_date: "2026-06-14" });
    const groups = groupAgenda([ev], TODAY);
    expect(groups.today).toHaveLength(1);
    expect(groups.today[0]).toBe(ev);
  });

  it("puts an event on today+1 in tomorrow bucket", () => {
    const ev = makeEvent({ event_date: "2026-06-15" });
    const groups = groupAgenda([ev], TODAY);
    expect(groups.tomorrow).toHaveLength(1);
  });

  it("puts an event today+2 to today+7 in thisWeek", () => {
    const ev2 = makeEvent({ event_id: "a", event_date: "2026-06-16" }); // +2
    const ev7 = makeEvent({ event_id: "b", event_date: "2026-06-21" }); // +7
    const groups = groupAgenda([ev2, ev7], TODAY);
    expect(groups.thisWeek).toHaveLength(2);
  });

  it("puts an event today+8 to today+14 in nextWeek", () => {
    const ev8  = makeEvent({ event_id: "c", event_date: "2026-06-22" }); // +8
    const ev14 = makeEvent({ event_id: "d", event_date: "2026-06-28" }); // +14
    const groups = groupAgenda([ev8, ev14], TODAY);
    expect(groups.nextWeek).toHaveLength(2);
  });

  it("puts events beyond +14 in later", () => {
    const ev = makeEvent({ event_date: "2026-07-30" });
    const groups = groupAgenda([ev], TODAY);
    expect(groups.later).toHaveLength(1);
  });

  it("puts past events in overdue", () => {
    const ev = makeEvent({ event_date: "2026-06-13" }); // yesterday
    const groups = groupAgenda([ev], TODAY);
    expect(groups.overdue).toHaveLength(1);
  });

  it("handles empty array without error", () => {
    const groups = groupAgenda([], TODAY);
    expect(groups.today).toHaveLength(0);
    expect(groups.tomorrow).toHaveLength(0);
    expect(groups.overdue).toHaveLength(0);
  });

  it("sorts events within each bucket ascending by date", () => {
    const ev1 = makeEvent({ event_id: "x", event_date: "2026-06-19" }); // +5
    const ev2 = makeEvent({ event_id: "y", event_date: "2026-06-17" }); // +3
    const groups = groupAgenda([ev1, ev2], TODAY);
    expect(groups.thisWeek[0]!.event_date).toBe("2026-06-17");
    expect(groups.thisWeek[1]!.event_date).toBe("2026-06-19");
  });

  it("correctly distributes multiple events across all buckets", () => {
    const events: CalendarEvent[] = [
      makeEvent({ event_id: "a", event_date: "2026-06-10" }), // overdue
      makeEvent({ event_id: "b", event_date: "2026-06-14" }), // today
      makeEvent({ event_id: "c", event_date: "2026-06-15" }), // tomorrow
      makeEvent({ event_id: "d", event_date: "2026-06-18" }), // thisWeek (+4)
      makeEvent({ event_id: "e", event_date: "2026-06-24" }), // nextWeek (+10)
      makeEvent({ event_id: "f", event_date: "2026-07-15" }), // later
    ];
    const groups = groupAgenda(events, TODAY);
    expect(groups.overdue).toHaveLength(1);
    expect(groups.today).toHaveLength(1);
    expect(groups.tomorrow).toHaveLength(1);
    expect(groups.thisWeek).toHaveLength(1);
    expect(groups.nextWeek).toHaveLength(1);
    expect(groups.later).toHaveLength(1);
  });
});

// ─── eventsForMonth ───────────────────────────────────────────────────────────

describe("eventsForMonth", () => {
  const events: CalendarEvent[] = [
    makeEvent({ event_id: "1", event_date: "2026-06-01" }),
    makeEvent({ event_id: "2", event_date: "2026-06-30" }),
    makeEvent({ event_id: "3", event_date: "2026-07-01" }),
    makeEvent({ event_id: "4", event_date: "2026-05-31" }),
  ];

  it("returns only events for the specified month", () => {
    const result = eventsForMonth(events, 2026, 5); // June (0-indexed)
    expect(result).toHaveLength(2);
    expect(result.map((e) => e.event_id)).toEqual(["1", "2"]);
  });

  it("returns empty array if no events in that month", () => {
    const result = eventsForMonth(events, 2026, 8); // September
    expect(result).toHaveLength(0);
  });

  it("correctly handles first and last day of month boundary", () => {
    const julyEvents = eventsForMonth(events, 2026, 6); // July
    expect(julyEvents).toHaveLength(1);
    expect(julyEvents[0]!.event_date).toBe("2026-07-01");
  });
});

// ─── monthGridDays ────────────────────────────────────────────────────────────

describe("monthGridDays", () => {
  it("always returns exactly 42 cells", () => {
    // Test several months
    expect(monthGridDays(2026, 0).length).toBe(42); // January
    expect(monthGridDays(2026, 1).length).toBe(42); // February (non-leap)
    expect(monthGridDays(2024, 1).length).toBe(42); // February (leap)
    expect(monthGridDays(2026, 5).length).toBe(42); // June 2026
    expect(monthGridDays(2026, 11).length).toBe(42); // December
  });

  it("first cell of June 2026 is Sunday 2026-05-31 (since June 1 = Monday)", () => {
    // June 1, 2026 is a Monday → startDow = 1
    // Leading pad: 1 cell (May 31, 2026 which is Sunday)
    const grid = monthGridDays(2026, 5);
    const first = grid[0]!;
    expect(first.isCurrentMonth).toBe(false);
    expect(first.date.getDay()).toBe(0); // Sunday
    expect(first.date.getDate()).toBe(31); // May 31
    expect(first.date.getMonth()).toBe(4); // May
  });

  it("the first current-month cell in June 2026 is June 1 and is at index 1", () => {
    const grid = monthGridDays(2026, 5);
    const juneFirst = grid[1]!;
    expect(juneFirst.isCurrentMonth).toBe(true);
    expect(juneFirst.dayNumber).toBe(1);
    expect(juneFirst.date.getMonth()).toBe(5); // June
  });

  it("all current-month cells have isCurrentMonth=true and correct dayNumber", () => {
    const grid = monthGridDays(2026, 5); // June = 30 days
    const currentMonthCells = grid.filter((c) => c.isCurrentMonth);
    expect(currentMonthCells).toHaveLength(30);
    currentMonthCells.forEach((cell, idx) => {
      expect(cell.dayNumber).toBe(idx + 1);
    });
  });

  it("trailing cells have isCurrentMonth=false and are from next month", () => {
    const grid = monthGridDays(2026, 5); // June
    const trailing = grid.filter((c) => !c.isCurrentMonth && c.date.getMonth() === 6); // July
    expect(trailing.length).toBeGreaterThan(0);
    trailing.forEach((cell, idx) => {
      expect(cell.dayNumber).toBe(idx + 1);
    });
  });

  it("column 0 is always Sunday (getDay()===0)", () => {
    // Every 7th cell starting from index 0 should be a Sunday
    const grid = monthGridDays(2026, 5);
    for (let row = 0; row < 6; row++) {
      const cell = grid[row * 7]!;
      expect(cell.date.getDay()).toBe(0); // Sunday
    }
  });

  it("column 6 is always Saturday (getDay()===6)", () => {
    const grid = monthGridDays(2026, 5);
    for (let row = 0; row < 6; row++) {
      const cell = grid[row * 7 + 6]!;
      expect(cell.date.getDay()).toBe(6); // Saturday
    }
  });

  it("works for January 2026 (starts on Thursday)", () => {
    // Jan 1, 2026 = Thursday = getDay() 4 → 4 leading cells
    const grid = monthGridDays(2026, 0);
    expect(grid.filter((c) => c.isCurrentMonth)).toHaveLength(31);
    const firstCurrent = grid.find((c) => c.isCurrentMonth)!;
    expect(firstCurrent.dayNumber).toBe(1);
    expect(grid.indexOf(firstCurrent)).toBe(4); // 4 leading pad cells
  });

  it("works for February 2024 (leap year, starts on Thursday)", () => {
    const grid = monthGridDays(2024, 1);
    expect(grid.filter((c) => c.isCurrentMonth)).toHaveLength(29);
  });
});
