import { describe, it, expect } from "vitest";
import {
  makeOpenDataCollector,
  wageToHourlyRate,
  wageToProjectRate,
  BILLABLE_HOURS_PER_YEAR,
  OVERHEAD_MULTIPLIER,
  FREELANCE_PREMIUM,
  PROJECT_HOURS,
  type WageObservation,
} from "./openData";

const CELL = {
  specialty_id: "11111111-1111-1111-1111-111111111111",
  city_id: "22222222-2222-2222-2222-222222222222",
  experience_tier_id: "33333333-3333-3333-3333-333333333333",
};

const obs = (over: Partial<WageObservation> = {}): WageObservation => ({
  ...CELL,
  project_size: "medium",
  monthly_wage_sar: 10_238, // GASTAT Q2 2018 headline, used here only as a shape
  occupation_label: "Saudi workers, four sectors",
  source_ref: "https://www.stats.gov.sa/en/labour-market-bulletin",
  ...over,
});

describe("wage → freelance rate conversion", () => {
  it("applies the published model, not a fudge factor", () => {
    const expected =
      ((10_238 * 12) / BILLABLE_HOURS_PER_YEAR) * OVERHEAD_MULTIPLIER * FREELANCE_PREMIUM;
    expect(wageToHourlyRate(10_238)).toBeCloseTo(expected, 6);
  });

  it("scales the hourly rate by the assumed hours for the size bucket", () => {
    for (const size of ["small", "medium", "large", "enterprise"] as const) {
      expect(wageToProjectRate(10_238, size)).toBe(
        Math.round(wageToHourlyRate(10_238) * PROJECT_HOURS[size]),
      );
    }
    // Monotonic: a bigger bucket must never price below a smaller one.
    expect(wageToProjectRate(10_238, "small")).toBeLessThan(wageToProjectRate(10_238, "large"));
  });

  it("an employed wage converts to strictly more than the salaried hourly equivalent", () => {
    // The whole point of the overhead + premium terms: a freelancer charging the
    // salaried rate is losing money. If this ever inverts, the constants are wrong.
    const salariedHourly = (10_238 * 12) / 2080;
    expect(wageToHourlyRate(10_238)).toBeGreaterThan(salariedHourly);
  });
});

describe("makeOpenDataCollector", () => {
  const captured = "2026-07-28T00:00:00Z";

  it("normalizes to ingested rows carrying the derivation", async () => {
    const c = makeOpenDataCollector([obs()], captured);
    const rows = await c.normalize(await c.fetch());

    expect(rows).toHaveLength(1);
    const row = rows[0]!;
    expect(row.provenance).toBe("ingested");
    // Was a hardcoded 0.4. Confidence now derives from the survey base the authority
    // published, and this fixture states none — so it lands in the unstated band.
    expect(row.confidence).toBe(0.5);
    expect(row.published_sample).toBeNull();
    expect(row.captured_at).toBe(captured);
    expect(row.price_sar).toBe(wageToProjectRate(10_238, "medium"));
    // The reader must be able to retrace the number from the row alone.
    expect(row.notes).toContain("10238");
    expect(row.notes).toContain(String(BILLABLE_HOURS_PER_YEAR));
    expect(row.notes).toContain(String(PROJECT_HOURS.medium));
  });

  it("rejects a row with no citation — an uncited wage is not open data", async () => {
    const c = makeOpenDataCollector(
      [obs({ source_ref: "  " }), obs({ monthly_wage_sar: 0 }), obs()],
      captured,
    );
    const rows = await c.normalize(await c.fetch());
    expect(rows).toHaveLength(1);
  });
});

describe("confidence follows the published survey base", () => {
  it("a stated base earns its band; an unstated one does not", async () => {
    const captured = "2026-07-28T00:00:00Z";
    const big = makeOpenDataCollector([obs({ published_sample: 60_000 })], captured);
    const none = makeOpenDataCollector([obs()], captured);
    const [bigRow] = await big.normalize(await big.fetch());
    const [noneRow] = await none.normalize(await none.fetch());
    expect(bigRow!.confidence).toBe(0.9);
    expect(noneRow!.confidence).toBe(0.5);
  });
});
