/**
 * Pure calendar helper module for Rizq Calendar (M9 / P5.5).
 * All functions are clock-injectable and side-effect free.
 */

export type CalendarEvent = {
  event_id: string;
  event_type: string;
  user_id: string;
  client_id: string | null;
  event_date: string; // ISO date "YYYY-MM-DD"
  title_ar: string;
  title_en: string;
  status: string;
  source_module: "proposal" | "gig" | "invoice" | "client";
  source_id: string;
  metadata: Record<string, unknown>;
};

export type AgendaGroups = {
  today: CalendarEvent[];
  tomorrow: CalendarEvent[];
  thisWeek: CalendarEvent[];
  nextWeek: CalendarEvent[];
  later: CalendarEvent[];
  overdue: CalendarEvent[];
};

/** Parse an ISO date string "YYYY-MM-DD" into a local Date at midnight. */
function parseLocalDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y!, (m! - 1), d!);
}

/** Return a Date representing the start of the day (midnight) for a given Date. */
function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/**
 * Group calendar events into agenda buckets relative to `today`.
 * Events before today are placed in `overdue`.
 * Events on today → today bucket.
 * Events on today+1 → tomorrow.
 * Events from today+2 .. end of same week (up to 6 days) → thisWeek.
 * Events in the following calendar week (Mon-based but we track Sun-start) → nextWeek.
 * Everything else → later.
 *
 * We define:
 *   thisWeek = [today+2 .. today+7]
 *   nextWeek = [today+8 .. today+14]
 */
export function groupAgenda(events: CalendarEvent[], today: Date): AgendaGroups {
  const todayMidnight = startOfDay(today);
  const todayMs = todayMidnight.getTime();

  const MS_DAY = 24 * 60 * 60 * 1000;

  const groups: AgendaGroups = {
    today: [],
    tomorrow: [],
    thisWeek: [],
    nextWeek: [],
    later: [],
    overdue: [],
  };

  // Sort events ascending by date before bucketing
  const sorted = [...events].sort((a, b) => {
    return parseLocalDate(a.event_date).getTime() - parseLocalDate(b.event_date).getTime();
  });

  for (const ev of sorted) {
    const evDate = startOfDay(parseLocalDate(ev.event_date));
    const diffDays = Math.round((evDate.getTime() - todayMs) / MS_DAY);

    if (diffDays < 0) {
      groups.overdue.push(ev);
    } else if (diffDays === 0) {
      groups.today.push(ev);
    } else if (diffDays === 1) {
      groups.tomorrow.push(ev);
    } else if (diffDays <= 7) {
      groups.thisWeek.push(ev);
    } else if (diffDays <= 14) {
      groups.nextWeek.push(ev);
    } else {
      groups.later.push(ev);
    }
  }

  return groups;
}

/**
 * Filter events to those whose event_date falls within a given year/month (0-indexed month).
 */
export function eventsForMonth(
  events: CalendarEvent[],
  year: number,
  month: number // 0-indexed (Jan=0)
): CalendarEvent[] {
  return events.filter((ev) => {
    const d = parseLocalDate(ev.event_date);
    return d.getFullYear() === year && d.getMonth() === month;
  });
}

export type GridDay = {
  date: Date;
  isCurrentMonth: boolean;
  dayNumber: number; // 1-31
};

/**
 * Generate a 42-cell (6-week) month grid, **Sunday-first** (Saudi week).
 * Cells before/after the month are padded from adjacent months.
 *
 * Column 0 = Sunday, Column 1 = Monday, ..., Column 6 = Saturday
 *
 * In RTL rendering, column 0 (Sunday) is displayed on the RIGHT —
 * the consumer must handle RTL column reversal at render time.
 */
export function monthGridDays(year: number, month: number): GridDay[] {
  // First day of the month
  const firstDay = new Date(year, month, 1);
  // getDay(): 0=Sun, 1=Mon, ..., 6=Sat  (already Sunday-first — perfect)
  const startDow = firstDay.getDay(); // 0-6, number of leading filler cells needed

  // Total days in the month
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: GridDay[] = [];

  // Leading cells from previous month
  for (let i = startDow - 1; i >= 0; i--) {
    const d = new Date(year, month, -i);
    cells.push({ date: d, isCurrentMonth: false, dayNumber: d.getDate() });
  }

  // Current month days
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month, day);
    cells.push({ date: d, isCurrentMonth: true, dayNumber: day });
  }

  // Trailing cells — pad to exactly 42
  let trailing = 1;
  while (cells.length < 42) {
    const d = new Date(year, month + 1, trailing++);
    cells.push({ date: d, isCurrentMonth: false, dayNumber: d.getDate() });
  }

  return cells;
}

/** Format a date as "YYYY-MM-DD" (local time) for event_date comparisons. */
export function formatDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
