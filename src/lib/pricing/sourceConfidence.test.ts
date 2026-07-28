import { describe, it, expect } from "vitest";
import {
  sourceConfidence,
  SAMPLE_CONFIDENCE_BANDS,
  UNSTATED_SAMPLE_CONFIDENCE,
} from "./sourceConfidence";

describe("sourceConfidence — band boundaries", () => {
  // Every boundary from contracts/source-confidence.md, inclusive floor / exclusive above.
  const cases: Array<[number, number]> = [
    [182_000, 0.9], // YunoJuno
    [50_000, 0.9],
    [49_999, 0.8],
    [23_928, 0.8], // Stack Overflow
    [5_000, 0.8],
    [4_999, 0.7],
    [4_200, 0.7], // Robert Half
    [1_100, 0.7], // EFA
    [500, 0.7],
    [499, 0.6],
    [300, 0.6], // Nonprofit.ist
    [220, 0.6], // ProCopywriters, copywriters
    [50, 0.6],
    [49, 0.5],
    [38, 0.5], // ProCopywriters, content writers
  ];

  for (const [sample, expected] of cases) {
    it(`${sample.toLocaleString("en-US")} → ${expected}`, () => {
      expect(sourceConfidence(sample)).toBe(expected);
    });
  }
});

describe("sourceConfidence — an unstated sample is never rewarded", () => {
  it("treats missing, zero, negative and non-finite alike", () => {
    for (const input of [null, undefined, 0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(sourceConfidence(input as number | null | undefined)).toBe(
        UNSTATED_SAMPLE_CONFIDENCE,
      );
    }
  });

  it("lands exactly on the weakest stated band, neither above nor below it", () => {
    // The column is a claim about sample size, not a penalty. A publisher who omits the
    // figure has said nothing, and nothing is not evidence of a small sample.
    expect(UNSTATED_SAMPLE_CONFIDENCE).toBe(sourceConfidence(1));
  });
});

describe("sourceConfidence — guarantees", () => {
  it("is total: never throws, always returns a finite number", () => {
    for (const input of [null, undefined, 0, -1e9, 1e12, 1.5, Number.NaN]) {
      const out = sourceConfidence(input as number | null | undefined);
      expect(Number.isFinite(out)).toBe(true);
    }
  });

  it("is monotonic non-decreasing in the sample size", () => {
    let prev = 0;
    for (const n of [1, 49, 50, 499, 500, 4_999, 5_000, 49_999, 50_000, 1_000_000]) {
      const out = sourceConfidence(n);
      expect(out).toBeGreaterThanOrEqual(prev);
      prev = out;
    }
  });

  it("never exceeds the top band — no input returns 1.0", () => {
    const top = Math.max(...SAMPLE_CONFIDENCE_BANDS.map((b) => b.confidence));
    expect(top).toBe(0.9);
    for (const n of [50_000, 1e6, 1e9, Number.MAX_SAFE_INTEGER]) {
      expect(sourceConfidence(n)).toBeLessThanOrEqual(top);
    }
  });

  it("accepts a non-integer sample — a band is a range test, not an equality", () => {
    expect(sourceConfidence(1_500.7)).toBe(0.7);
  });

  it("bands are declared high to low, which the lookup depends on", () => {
    const mins = SAMPLE_CONFIDENCE_BANDS.map((b) => b.min);
    expect(mins).toEqual([...mins].sort((a, b) => b - a));
  });
});
