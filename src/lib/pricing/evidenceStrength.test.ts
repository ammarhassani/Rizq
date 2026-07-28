import { describe, it, expect } from "vitest";
import { evidenceStrength, MAX_ATTAINABLE_SCORE } from "./evidenceStrength";

describe("evidenceStrength", () => {
  it("maps the three bands", () => {
    expect(evidenceStrength(0.05)).toBe("limited");
    expect(evidenceStrength(0.12)).toBe("moderate"); // corpus average today
    expect(evidenceStrength(0.25)).toBe("good");
  });

  it("the top band is reachable inside the attainable range", () => {
    // The bug this replaces: a percentage whose maximum was 0.36, so no result could
    // ever read above 36%. If a future weighting change makes even "good" unreachable,
    // this fails rather than silently pinning every result to "limited".
    expect(evidenceStrength(MAX_ATTAINABLE_SCORE)).toBe("good");
  });

  it("is monotonic and total", () => {
    const order = { limited: 0, moderate: 1, good: 2 };
    let prev = -1;
    for (let s = 0; s <= 1.0001; s += 0.01) {
      const rank = order[evidenceStrength(s)];
      expect(rank).toBeGreaterThanOrEqual(prev);
      prev = rank;
    }
  });

  it("treats a broken score as the weakest claim, never the strongest", () => {
    expect(evidenceStrength(Number.NaN)).toBe("limited");
    expect(evidenceStrength(-1)).toBe("limited");
  });
});
