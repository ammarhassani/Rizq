/**
 * Pure rate calculator — spec M10.2.
 * No I/O, no side effects. All inputs injected; safe to unit-test.
 *
 * Rounding semantics:
 * - `roundSar(n)` rounds to the nearest 10 SAR for values ≥ 100, or the
 *   nearest whole SAR for smaller values. This keeps hourly/daily/project
 *   rates human-readable without introducing large errors on small amounts.
 *
 * Percentile approximation (documented):
 * - The band [min, anchor, max] maps linearly to percentile landmarks
 *   [10, 50, 90]. We interpolate linearly within each segment:
 *   - per_project ≤ min → ~10 (clamped to 1)
 *   - min < per_project ≤ anchor → lerp [10, 50]
 *   - anchor < per_project ≤ max → lerp [50, 90]
 *   - per_project > max → ~90 (clamped to 99)
 * - This is a rough ordinal estimate, not a true CDF. It is clearly labeled
 *   as an approximation in the UI.
 */

export type RateCalculatorInput = {
  monthly_target_sar: number;
  working_days_per_month: number;
  hours_per_day: number;
  projects_per_month_target: number;
};

export type MarketBand = {
  min: number;
  anchor: number;
  max: number;
  sample_size: number;
};

export type RateCalculatorOutput = {
  /** Hourly rate needed to hit monthly target */
  hourly_rate: number;
  /** Daily rate (hourly × hours_per_day) */
  daily_rate: number;
  /**
   * Per-project rate = monthly_target / projects_per_month_target.
   * null when projects_per_month_target is 0 (divide-by-zero guard).
   */
  per_project_rate: number | null;
  /**
   * How many projects per month are needed at the anchor market rate to hit
   * the monthly target. null when anchor is 0.
   */
  projects_needed_per_month: number | null;
  /**
   * Estimated percentile where the per_project_rate sits in the market band
   * (1–99). null when per_project_rate is null.
   */
  market_percentile: number | null;
  /**
   * true when market_percentile ≤ 90 (the rate is achievable within the
   * documented market range). null when market_percentile is null.
   */
  is_realistic: boolean | null;
  /** Rule-based context string (Arabic) */
  market_context_ar: string;
  /** Rule-based context string (English) */
  market_context_en: string;
  /** Actionable suggestion (Arabic) */
  suggestion_ar: string;
  /** Actionable suggestion (English) */
  suggestion_en: string;
};

/**
 * Rounds n to the nearest 10 SAR when n ≥ 100, otherwise to the nearest
 * whole SAR. Never returns negative.
 */
export function roundSar(n: number): number {
  if (!Number.isFinite(n) || n < 0) return 0;
  if (n >= 100) return Math.round(n / 10) * 10;
  return Math.round(n);
}

/**
 * Estimates where `value` sits in the band [min..max] using the piecewise
 * linear mapping: min→10, anchor→50, max→90.
 * Returns a percentile in [1..99], clamped.
 */
function estimatePercentile(value: number, band: MarketBand): number {
  const { min, anchor, max } = band;

  // Guard: degenerate band (all zeros or invalid)
  if (!Number.isFinite(min) || !Number.isFinite(anchor) || !Number.isFinite(max)) {
    return 50;
  }
  if (max <= min) {
    // Flat band — treat anchor as the 50th percentile point
    return value <= anchor ? 10 : 90;
  }

  let pct: number;
  if (value <= min) {
    pct = 10;
  } else if (value <= anchor) {
    // lerp between (min, 10) and (anchor, 50)
    const denom = anchor - min;
    pct = denom === 0 ? 10 : 10 + ((value - min) / denom) * 40;
  } else if (value <= max) {
    // lerp between (anchor, 50) and (max, 90)
    const denom = max - anchor;
    pct = denom === 0 ? 90 : 50 + ((value - anchor) / denom) * 40;
  } else {
    pct = 90;
  }

  return Math.min(99, Math.max(1, Math.round(pct)));
}

function buildContextAr(pct: number | null, per_project: number | null): string {
  if (per_project === null || pct === null) {
    return "لم يتمكن رِزق من مقارنة سعرك بالسوق — أدخل هدفك الشهري وعدد المشاريع للحصول على التحليل الكامل.";
  }
  if (pct <= 25) {
    return `سعرك المستهدف (${per_project.toLocaleString("ar-SA")} ريال للمشروع) في أدنى ٢٥٪ من السوق — هناك مجال للرفع بثقة.`;
  }
  if (pct <= 50) {
    return `سعرك المستهدف (${per_project.toLocaleString("ar-SA")} ريال للمشروع) في النصف الأدنى من السوق — سعر تنافسي ومقبول.`;
  }
  if (pct <= 75) {
    return `سعرك المستهدف (${per_project.toLocaleString("ar-SA")} ريال للمشروع) فوق المتوسط — أنت في الشريحة العليا من السوق.`;
  }
  if (pct <= 90) {
    return `سعرك المستهدف (${per_project.toLocaleString("ar-SA")} ريال للمشروع) في أعلى ٢٥٪ من السوق — مطلوب تمييز واضح في تسويقك.`;
  }
  return `سعرك المستهدف (${per_project.toLocaleString("ar-SA")} ريال للمشروع) أعلى من ٩٠٪ من السوق — يصعب تحقيقه دون خبرة متميزة أو عملاء مؤسسيين.`;
}

function buildContextEn(pct: number | null, per_project: number | null): string {
  if (per_project === null || pct === null) {
    return "Rizq could not compare your rate to the market — enter your monthly target and project count for a full analysis.";
  }
  if (pct <= 25) {
    return `Your target rate (SAR ${per_project.toLocaleString("en-US")} / project) is in the bottom 25% of the market — there's confident room to raise it.`;
  }
  if (pct <= 50) {
    return `Your target rate (SAR ${per_project.toLocaleString("en-US")} / project) is in the lower half of the market — competitive and accessible.`;
  }
  if (pct <= 75) {
    return `Your target rate (SAR ${per_project.toLocaleString("en-US")} / project) is above average — you're in the upper tier of the market.`;
  }
  if (pct <= 90) {
    return `Your target rate (SAR ${per_project.toLocaleString("en-US")} / project) is in the top 25% of the market — clear differentiation in your marketing is key.`;
  }
  return `Your target rate (SAR ${per_project.toLocaleString("en-US")} / project) exceeds 90% of the market — hard to achieve without exceptional experience or enterprise clients.`;
}

function buildSuggestionAr(pct: number | null, is_realistic: boolean | null): string {
  if (pct === null || is_realistic === null) {
    return "ابدأ بتحديد هدفك الشهري وعدد المشاريع الذي تستهدفه للحصول على توصية مخصصة.";
  }
  if (!is_realistic) {
    return "سعرك أعلى من ٩٠٪ من السوق. فكّر في تقليل عدد المشاريع المستهدفة وتخصيص وقت أكبر لكل مشروع، أو بناء سمعة متخصصة تبرر السعر.";
  }
  if (pct <= 25) {
    return "سعرك أقل من المتوسط — جرّب رفعه بنسبة ١٠–٢٠٪ في عرضك القادم واقرأ ردود فعل العملاء.";
  }
  if (pct <= 50) {
    return "سعرك في النطاق التنافسي. ركّز على جودة عرضك وسرعة الاستجابة للفوز بالمشاريع.";
  }
  if (pct <= 75) {
    return "سعرك فوق المتوسط — احرص على إبراز قيمتك المضافة وخبرتك في عروضك بوضوح.";
  }
  return "سعرك في الشريحة العليا — تأكد أن ملفك المهني وتجربتك المعروضة تدعم هذا السعر بقوة.";
}

function buildSuggestionEn(pct: number | null, is_realistic: boolean | null): string {
  if (pct === null || is_realistic === null) {
    return "Start by setting your monthly target and project count to get a personalized recommendation.";
  }
  if (!is_realistic) {
    return "Your rate exceeds 90% of the market. Consider targeting fewer projects per month with more time per project, or build a niche reputation that justifies the premium.";
  }
  if (pct <= 25) {
    return "Your rate is below average — try raising it by 10–20% on your next proposal and watch client response.";
  }
  if (pct <= 50) {
    return "Your rate is in the competitive range. Focus on proposal quality and response speed to win projects.";
  }
  if (pct <= 75) {
    return "Your rate is above average — make sure your added value and expertise are clearly communicated in proposals.";
  }
  return "Your rate is in the premium tier — ensure your portfolio and experience showcase strong justification for it.";
}

/**
 * Main pure rate calculator.
 *
 * @param input  - User inputs (target, days, hours, projects).
 * @param market - Market band from resolvePrice (or null when insufficient data).
 * @returns      - Full rate output with math + rule-based context strings.
 */
export function calculateRate(
  input: RateCalculatorInput,
  market: MarketBand | null
): RateCalculatorOutput {
  const { monthly_target_sar, working_days_per_month, hours_per_day, projects_per_month_target } =
    input;

  // Guard: totalBillableHours must be positive
  const totalBillableHours =
    working_days_per_month > 0 && hours_per_day > 0
      ? working_days_per_month * hours_per_day
      : 0;

  const hourly_rate = totalBillableHours > 0 ? roundSar(monthly_target_sar / totalBillableHours) : 0;
  const daily_rate = roundSar(hourly_rate * (hours_per_day > 0 ? hours_per_day : 0));

  // Per-project rate: guard divide-by-zero
  const per_project_rate =
    projects_per_month_target > 0
      ? roundSar(monthly_target_sar / projects_per_month_target)
      : null;

  // Projects needed at anchor rate
  const projects_needed_per_month =
    market && market.anchor > 0
      ? Math.ceil(monthly_target_sar / market.anchor)
      : null;

  // Market percentile
  const market_percentile =
    market && per_project_rate !== null
      ? estimatePercentile(per_project_rate, market)
      : null;

  // is_realistic
  const is_realistic =
    market_percentile !== null ? market_percentile <= 90 : null;

  return {
    hourly_rate,
    daily_rate,
    per_project_rate,
    projects_needed_per_month,
    market_percentile,
    is_realistic,
    market_context_ar: buildContextAr(market_percentile, per_project_rate),
    market_context_en: buildContextEn(market_percentile, per_project_rate),
    suggestion_ar: buildSuggestionAr(market_percentile, is_realistic),
    suggestion_en: buildSuggestionEn(market_percentile, is_realistic),
  };
}
