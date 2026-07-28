import { describe, it, expect } from "vitest";
import {
  makePublishedRefCollector,
  usdHourlyToSarProject,
  SAR_PER_INTERNATIONAL_DOLLAR,
} from "./publishedRef";
import { PROJECT_HOURS } from "../contribution";

describe("PPP bridge for foreign rate reports", () => {
  it("converts at purchasing power, not at the SAMA peg", () => {
    // The peg (3.75) would price local work at the US dollar rate. Guarding the
    // distinction because it is invisible in the output — both produce a plausible
    // SAR number, and only one of them is a claim we can cite.
    const atPpp = usdHourlyToSarProject(88, "medium");
    const atPeg = Math.round(88 * 3.75 * PROJECT_HOURS.medium);
    expect(atPpp).toBeLessThan(atPeg);
    expect(atPpp).toBe(Math.round(88 * SAR_PER_INTERNATIONAL_DOLLAR * PROJECT_HOURS.medium));
  });

  it("matches the figures seeded into the corpus", () => {
    // YunoJuno 2026 Software Engineering, $88/hr — the numbers in migration
    // 20260729091000. If the constants move, this fails and the seed is stale.
    expect(usdHourlyToSarProject(88, "small")).toBe(1302);
    expect(usdHourlyToSarProject(88, "medium")).toBe(3907);
    expect(usdHourlyToSarProject(88, "large")).toBe(9768);
    expect(usdHourlyToSarProject(88, "enterprise")).toBe(26048);
    // EFA translation, low end of the published range.
    expect(usdHourlyToSarProject(47.5, "small")).toBe(703);
  });

  it("is monotonic across project sizes", () => {
    const sizes = ["small", "medium", "large", "enterprise"] as const;
    const prices = sizes.map((s) => usdHourlyToSarProject(70, s));
    expect(prices).toEqual([...prices].sort((a, b) => a - b));
  });
});

describe("makePublishedRefCollector", () => {
  it("drops rows with no citation — a published reference without one is not one", async () => {
    const base = {
      specialty_id: "s",
      city_id: "c",
      experience_tier_id: "t",
      price_sar: 1000,
    };
    const c = makePublishedRefCollector(
      [
        { ...base, source_ref: "https://www.the-efa.org/rates/" },
        { ...base, source_ref: "   " },
        { ...base, source_ref: "https://www.yunojuno.com/freelancer-rates-report" },
      ],
      "2026-07-29T00:00:00Z"
    );
    const rows = await c.normalize(await c.fetch());
    expect(rows).toHaveLength(2);
    expect(rows.every((r) => r.provenance === "published_ref")).toBe(true);
  });
});

describe("confidence is derived from the published sample, never hand-picked", () => {
  const base = {
    specialty_id: "s",
    city_id: "c",
    experience_tier_id: "t",
    price_sar: 1000,
    source_ref: "https://www.yunojuno.com/freelancer-rates-report",
  };

  it("a large stated sample outweighs a small one through the collector", async () => {
    const c = makePublishedRefCollector(
      [
        { ...base, published_sample: 182_000 },
        { ...base, published_sample: 298 },
        { ...base }, // publisher stated none
      ],
      "2026-07-29T00:00:00Z"
    );
    const [big, small, unstated] = await c.normalize(await c.fetch());
    expect(big!.confidence).toBe(0.9);
    expect(small!.confidence).toBe(0.6);
    expect(unstated!.confidence).toBe(0.5);
    // The defect this replaces: all three used to be 0.6.
    expect(new Set([big!.confidence, small!.confidence, unstated!.confidence]).size).toBe(3);
  });

  it("carries the sample onto the row so the weighting stays auditable", async () => {
    const c = makePublishedRefCollector(
      [{ ...base, published_sample: 23_928 }],
      "2026-07-29T00:00:00Z"
    );
    const [row] = await c.normalize(await c.fetch());
    expect(row!.published_sample).toBe(23_928);
  });
});
