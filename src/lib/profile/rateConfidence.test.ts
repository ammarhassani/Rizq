import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * `rate_confidence` records a CHOICE, so "not chosen" has to survive every layer.
 *
 * It did not. The column was NOT NULL DEFAULT 'approximate', the snapshot loader coerced null
 * back to 'approximate', and the rates step sent its own 'approximate' fallback on every save
 * — so a brand-new account showed the pill pressed and the row agreed, for a click that never
 * happened (FR-015). Migration 20260727083200 dropped the default; these guards keep the
 * application from putting it back.
 */

const root = path.resolve(__dirname, "../../..");
const read = (p: string) => readFileSync(path.join(root, p), "utf8");

describe("rate_confidence stays null until the freelancer picks one", () => {
  it("the profile snapshot does not substitute a value for null", () => {
    const src = read("src/lib/profile/snapshot.ts");
    const line = src
      .split("\n")
      .find((l) => l.includes("rate_confidence:") && l.includes("??"));
    expect(line, "snapshot.ts no longer maps rate_confidence").toBeDefined();
    expect(line, `snapshot.ts defaults rate_confidence: ${line?.trim()}`).not.toMatch(
      /\?\?\s*["'](exact|approximate|estimate)["']/,
    );
  });

  it("the wizard step seeds its control from the profile without a fallback value", () => {
    const src = read("src/components/onboarding/StepRates.tsx");
    // [^>]* already spans newlines, so no dotAll flag (which needs an es2018 target).
    expect(src).toMatch(/useState<[^>]*>\(\s*profile\.rate_confidence \?\? null\s*\)/);
  });

  it("the rates step omits the field entirely when nothing was chosen", () => {
    const src = read("src/components/onboarding/StepRates.tsx");
    expect(src).toContain("...(rateConfidence ? { rate_confidence: rateConfidence } : {})");
  });

  it("the step type admits null", () => {
    const src = read("src/components/onboarding/types.ts");
    expect(src).toMatch(/rate_confidence:\s*"exact"\s*\|\s*"approximate"\s*\|\s*"estimate"\s*\|\s*null/);
  });

  it("a migration drops the column default and the NOT NULL", () => {
    const sql = read("supabase/migrations/20260727083200_rate_confidence_only_when_chosen.sql");
    expect(sql).toMatch(/alter column rate_confidence drop default/i);
    expect(sql).toMatch(/alter column rate_confidence drop not null/i);
  });
});
