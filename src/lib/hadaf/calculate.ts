/**
 * Pure HADAF eligibility calculator — spec P5.7 / M5.
 * No I/O, no side effects. Clock injected via `today` parameter.
 *
 * Streak semantics (documented here, pinned by tests):
 * - Months are compared chronologically as YYYY-MM strings.
 * - `current_streak` is the count of **consecutive qualifying months ending
 *   at (and including) the current month**. If the current month's income is
 *   below the threshold, streak = 0 (broken).
 * - An in-progress current month counts: whatever income is recorded so far
 *   is compared to the threshold. This is intentional — the UI shows live
 *   progress.
 * - Only the last 12 calendar months (inclusive of the current month) are
 *   considered for streak_history and subsidy calculation. The window spans
 *   from (currentMonth - 11) through currentMonth, inclusive — 12 months total.
 *
 * Subsidy semantics:
 * - estimated_subsidy = round(avg(qualifying-month incomes within the
 *   current streak) × subsidy_pct / 100, 2).
 * - Capped at max_subsidy_sar when the rules set it to a positive number.
 * - Returns null when status is 'no_data' or streak = 0.
 */

export type HadafRules = {
  platform: string;
  minimum_monthly_income_sar: number;
  consecutive_months_required: number;
  subsidy_pct: number;
  max_subsidy_sar: number | null;
  eligibility_requirements?: string[];
  effective_date?: string;
  source_url?: string;
};

export type MonthIncome = {
  /** ISO YYYY-MM */
  month: string;
  income: number;
};

export type StreakMonth = {
  month: string;
  income: number;
  qualifying: boolean;
};

export type HadafStatus = {
  current_streak: number;
  current_month_status: "qualifying" | "not_qualifying" | "no_data";
  current_month_income: number;
  months_to_qualify: number;
  estimated_subsidy: number | null;
  /** Chronological order (oldest first), last 12 months. */
  streak_history: StreakMonth[];
};

/** Format a Date as YYYY-MM (UTC-safe: uses the date's local-ish year/month). */
function toYearMonth(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/** Add `months` calendar months to a YYYY-MM string. */
function addMonths(ym: string, months: number): string {
  const [y, m] = ym.split("-").map(Number);
  const date = new Date(y, m - 1 + months, 1);
  return toYearMonth(date);
}

/** Return all YYYY-MM values in [start, end] inclusive (chronological). */
function monthRange(start: string, end: string): string[] {
  const result: string[] = [];
  let cur = start;
  while (cur <= end) {
    result.push(cur);
    cur = addMonths(cur, 1);
  }
  return result;
}

/**
 * Calculates HADAF subsidy eligibility status.
 *
 * @param rules    - Config-driven rules from hadaf_rules_config.rules_json.
 * @param monthlyIncomes - Income records bucketed by month. May be empty.
 * @param today    - Injected clock (no hidden Date.now()).
 */
export function calculateHadafStatus(
  rules: HadafRules,
  monthlyIncomes: MonthIncome[],
  today: Date
): HadafStatus {
  const threshold = rules.minimum_monthly_income_sar;
  const currentMonth = toYearMonth(today);

  // Build a lookup map: YYYY-MM → income
  const incomeByMonth = new Map<string, number>();
  for (const mi of monthlyIncomes) {
    // Sum multiple rows for the same month (defensive)
    incomeByMonth.set(mi.month, (incomeByMonth.get(mi.month) ?? 0) + mi.income);
  }

  // Determine no_data: no income rows at all
  if (incomeByMonth.size === 0) {
    return {
      current_streak: 0,
      current_month_status: "no_data",
      current_month_income: 0,
      months_to_qualify: rules.consecutive_months_required,
      estimated_subsidy: null,
      streak_history: [],
    };
  }

  // Build last-12-months window (oldest → newest, ending at currentMonth)
  const windowStart = addMonths(currentMonth, -11);
  const window12 = monthRange(windowStart, currentMonth);

  // Build streak_history (chronological, oldest first)
  const streak_history: StreakMonth[] = window12.map((ym) => {
    const income = incomeByMonth.get(ym) ?? 0;
    return {
      month: ym,
      income,
      qualifying: income >= threshold,
    };
  });

  // Current month income and status
  const current_month_income = incomeByMonth.get(currentMonth) ?? 0;
  const currentQualifies = current_month_income >= threshold;
  const current_month_status: "qualifying" | "not_qualifying" = currentQualifies
    ? "qualifying"
    : "not_qualifying";

  // Compute current_streak: walk backwards from currentMonth while each
  // consecutive month qualifies. If current doesn't qualify, streak = 0.
  let current_streak = 0;
  if (currentQualifies) {
    // Walk backwards through window12 in reverse
    const reversed = [...streak_history].reverse();
    for (const entry of reversed) {
      if (entry.qualifying) {
        current_streak++;
      } else {
        break;
      }
    }
  }

  const months_to_qualify = Math.max(
    0,
    rules.consecutive_months_required - current_streak
  );

  // Estimated subsidy: avg income of the qualifying months within the streak
  let estimated_subsidy: number | null = null;
  if (current_streak > 0) {
    // The streak months are the last `current_streak` months from the window
    const streakMonths = streak_history.slice(-current_streak);
    const avgIncome =
      streakMonths.reduce((sum, m) => sum + m.income, 0) / streakMonths.length;
    let subsidy = Math.round(avgIncome * (rules.subsidy_pct / 100) * 100) / 100;
    if (rules.max_subsidy_sar != null && rules.max_subsidy_sar > 0) {
      subsidy = Math.min(subsidy, rules.max_subsidy_sar);
    }
    estimated_subsidy = subsidy;
  }

  return {
    current_streak,
    current_month_status,
    current_month_income,
    months_to_qualify,
    estimated_subsidy,
    streak_history,
  };
}
