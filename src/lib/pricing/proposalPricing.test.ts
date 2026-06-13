import { describe, it, expect } from "vitest";
import {
  computeProposalPrice,
  personalWeight,
  type MarketBand,
  type PricingModifierInput,
} from "./proposalPricing";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const NO_MODS: PricingModifierInput = {
  urgency: null,
  client_type: null,
  ip_transfer: null,
};

function band(min: number, anchor: number, max: number): MarketBand {
  return { min, anchor, max };
}

// ---------------------------------------------------------------------------
// personalWeight
// ---------------------------------------------------------------------------

describe("personalWeight", () => {
  it("returns 0 for N=0 (no history)", () => {
    expect(personalWeight(0)).toBe(0);
  });

  it("returns 0.1 for N=1 and N=2", () => {
    expect(personalWeight(1)).toBe(0.1);
    expect(personalWeight(2)).toBe(0.1);
  });

  it("returns 0.3 for N=3 and N=10", () => {
    expect(personalWeight(3)).toBe(0.3);
    expect(personalWeight(10)).toBe(0.3);
  });

  it("returns 0.5 for N=11 and above", () => {
    expect(personalWeight(11)).toBe(0.5);
    expect(personalWeight(100)).toBe(0.5);
  });

  it("returns 0 for negative N", () => {
    expect(personalWeight(-5)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Modifier pinning
// ---------------------------------------------------------------------------

describe("computeProposalPrice — modifier pinning", () => {
  const MARKET = band(1000, 2000, 5000);

  it("urgency null → modifier 1.0 (no change)", () => {
    const r = computeProposalPrice(MARKET, { ...NO_MODS, urgency: null }, []);
    expect(r.modifiers.urgency).toBe(1.0);
  });

  it("urgency standard_1_4_weeks → modifier 1.0", () => {
    const r = computeProposalPrice(MARKET, { ...NO_MODS, urgency: "standard_1_4_weeks" }, []);
    expect(r.modifiers.urgency).toBe(1.0);
  });

  it("urgency rush_under_1_week → modifier 1.15", () => {
    const r = computeProposalPrice(MARKET, { ...NO_MODS, urgency: "rush_under_1_week" }, []);
    expect(r.modifiers.urgency).toBe(1.15);
  });

  it("urgency long_term → modifier 0.9", () => {
    const r = computeProposalPrice(MARKET, { ...NO_MODS, urgency: "long_term" }, []);
    expect(r.modifiers.urgency).toBe(0.9);
  });

  it("client_type null → modifier 1.0", () => {
    const r = computeProposalPrice(MARKET, { ...NO_MODS, client_type: null }, []);
    expect(r.modifiers.client_type).toBe(1.0);
  });

  it("client_type smb → modifier 1.0", () => {
    const r = computeProposalPrice(MARKET, { ...NO_MODS, client_type: "smb" }, []);
    expect(r.modifiers.client_type).toBe(1.0);
  });

  it("client_type government → modifier 1.0", () => {
    const r = computeProposalPrice(MARKET, { ...NO_MODS, client_type: "government" }, []);
    expect(r.modifiers.client_type).toBe(1.0);
  });

  it("client_type agency → modifier 1.0", () => {
    const r = computeProposalPrice(MARKET, { ...NO_MODS, client_type: "agency" }, []);
    expect(r.modifiers.client_type).toBe(1.0);
  });

  it("client_type corporate → modifier 1.1", () => {
    const r = computeProposalPrice(MARKET, { ...NO_MODS, client_type: "corporate" }, []);
    expect(r.modifiers.client_type).toBe(1.1);
  });

  it("client_type individual → modifier 0.95", () => {
    const r = computeProposalPrice(MARKET, { ...NO_MODS, client_type: "individual" }, []);
    expect(r.modifiers.client_type).toBe(0.95);
  });

  it("ip_transfer null → modifier 1.0", () => {
    const r = computeProposalPrice(MARKET, { ...NO_MODS, ip_transfer: null }, []);
    expect(r.modifiers.ip).toBe(1.0);
  });

  it("ip_transfer unclear → modifier 1.0", () => {
    const r = computeProposalPrice(MARKET, { ...NO_MODS, ip_transfer: "unclear" }, []);
    expect(r.modifiers.ip).toBe(1.0);
  });

  it("ip_transfer full_transfer → modifier 1.2", () => {
    const r = computeProposalPrice(MARKET, { ...NO_MODS, ip_transfer: "full_transfer" }, []);
    expect(r.modifiers.ip).toBe(1.2);
  });

  it("ip_transfer license → modifier 0.95", () => {
    const r = computeProposalPrice(MARKET, { ...NO_MODS, ip_transfer: "license" }, []);
    expect(r.modifiers.ip).toBe(0.95);
  });

  it("complexity modifier is always 1.0 (reserved)", () => {
    const r = computeProposalPrice(MARKET, NO_MODS, []);
    expect(r.modifiers.complexity).toBe(1.0);
  });
});

// ---------------------------------------------------------------------------
// Composition
// ---------------------------------------------------------------------------

describe("computeProposalPrice — composition", () => {
  it("corporate + rush + full_transfer lifts the anchor above the plain market anchor", () => {
    const market = band(1000, 2000, 10000);
    const bullish: PricingModifierInput = {
      urgency: "rush_under_1_week",  // ×1.15
      client_type: "corporate",      // ×1.1
      ip_transfer: "full_transfer",  // ×1.2
    };
    const plain = computeProposalPrice(market, NO_MODS, []);
    const boosted = computeProposalPrice(market, bullish, []);
    // With no personal history the anchor reflects only the modifiers
    expect(boosted.anchor).toBeGreaterThan(plain.anchor);
  });

  it("individual + long_term + license lowers the anchor relative to no modifiers", () => {
    const market = band(1000, 3000, 8000);
    const bearish: PricingModifierInput = {
      urgency: "long_term",       // ×0.9
      client_type: "individual",  // ×0.95
      ip_transfer: "license",     // ×0.95
    };
    const plain = computeProposalPrice(market, NO_MODS, []);
    const discounted = computeProposalPrice(market, bearish, []);
    expect(discounted.anchor).toBeLessThan(plain.anchor);
  });
});

// ---------------------------------------------------------------------------
// Band invariant
// ---------------------------------------------------------------------------

describe("computeProposalPrice — band invariant min ≤ anchor ≤ max", () => {
  const cases: Array<{ label: string; market: MarketBand; mods: PricingModifierInput; past: number[] }> = [
    {
      label: "no modifiers, no history",
      market: band(1000, 2000, 5000),
      mods: NO_MODS,
      past: [],
    },
    {
      label: "tight band {970,980,990} with full_transfer+rush+corporate (anchors would overshoot)",
      market: band(970, 980, 990),
      mods: { urgency: "rush_under_1_week", client_type: "corporate", ip_transfer: "full_transfer" },
      past: [],
    },
    {
      label: "tight band with bearish mods (anchor would undershoot)",
      market: band(970, 975, 990),
      mods: { urgency: "long_term", client_type: "individual", ip_transfer: "license" },
      past: [],
    },
    {
      label: "large band with personal history pulling high",
      market: band(1000, 2000, 8000),
      mods: NO_MODS,
      past: [7000, 7500, 8000],
    },
    {
      label: "large band with personal history pulling low",
      market: band(1000, 5000, 8000),
      mods: NO_MODS,
      past: [100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100],
    },
    {
      label: "single-value band (min=anchor=max)",
      market: band(1000, 1000, 1000),
      mods: { urgency: "rush_under_1_week", client_type: "corporate", ip_transfer: "full_transfer" },
      past: [500],
    },
  ];

  for (const { label, market, mods, past } of cases) {
    it(`invariant holds: ${label}`, () => {
      const r = computeProposalPrice(market, mods, past);
      expect(r.min).toBeLessThanOrEqual(r.anchor);
      expect(r.anchor).toBeLessThanOrEqual(r.max);
    });
  }

  it("min rounds to nearest 10", () => {
    const r = computeProposalPrice(band(973, 980, 995), NO_MODS, []);
    expect(r.min % 10).toBe(0);
  });

  it("max rounds to nearest 10", () => {
    const r = computeProposalPrice(band(1000, 1500, 4997), NO_MODS, []);
    expect(r.max % 10).toBe(0);
  });

  it("anchor is a multiple of 50 when not clamped to band edge", () => {
    // Wide band: anchor won't hit edge
    const r = computeProposalPrice(band(100, 2000, 9900), NO_MODS, []);
    // anchor must be a multiple of 50 OR equal min or max (clamped edge)
    const isMultOf50 = r.anchor % 50 === 0;
    const isEdge = r.anchor === r.min || r.anchor === r.max;
    expect(isMultOf50 || isEdge).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Personal blending
// ---------------------------------------------------------------------------

describe("computeProposalPrice — personal blending", () => {
  it("empty pastAnchors → personal_weight 0 and anchor unaffected by blending", () => {
    const r = computeProposalPrice(band(1000, 2000, 8000), NO_MODS, []);
    expect(r.personal_weight).toBe(0);
    // Without blending, anchor should round 2000 to 2000 (already multiple of 50)
    expect(r.anchor).toBe(2000);
  });

  it("with N=3 pastAnchors [5000,5000,5000] the anchor moves toward 5000 vs no-history", () => {
    const market = band(1000, 2000, 8000);
    const noHistory = computeProposalPrice(market, NO_MODS, []);
    const withHistory = computeProposalPrice(market, NO_MODS, [5000, 5000, 5000]);
    // w=0.3 → blended = 2000*0.7 + 5000*0.3 = 1400+1500 = 2900
    expect(withHistory.anchor).toBeGreaterThan(noHistory.anchor);
    expect(withHistory.personal_weight).toBe(0.3);
  });

  it("pins the blended value: market anchor=2000, personal median=5000, w=0.3 → blended≈2900→2900", () => {
    const r = computeProposalPrice(band(1000, 2000, 8000), NO_MODS, [5000, 5000, 5000]);
    // 2000*0.7 + 5000*0.3 = 2900 (already multiple of 50)
    expect(r.anchor).toBe(2900);
  });

  it("N=1 → personal_weight 0.1", () => {
    const r = computeProposalPrice(band(1000, 3000, 8000), NO_MODS, [5000]);
    expect(r.personal_weight).toBe(0.1);
    // blended = 3000*0.9 + 5000*0.1 = 2700 + 500 = 3200
    expect(r.anchor).toBe(3200);
  });

  it("N=11 → personal_weight 0.5", () => {
    const past = Array.from({ length: 11 }, () => 4000);
    const r = computeProposalPrice(band(1000, 2000, 8000), NO_MODS, past);
    expect(r.personal_weight).toBe(0.5);
    // blended = 2000*0.5 + 4000*0.5 = 1000+2000 = 3000
    expect(r.anchor).toBe(3000);
  });

  it("uses median of past anchors (not mean)", () => {
    // Median of [1000,2000,9000] = 2000  (mean would be 4000)
    const r = computeProposalPrice(band(500, 3000, 20000), NO_MODS, [1000, 2000, 9000]);
    // w=0.3; blended = 3000*0.7 + 2000*0.3 = 2100+600 = 2700
    expect(r.anchor).toBe(2700);
  });
});

// ---------------------------------------------------------------------------
// Output shape
// ---------------------------------------------------------------------------

describe("computeProposalPrice — output shape", () => {
  it("returns all required fields", () => {
    const r = computeProposalPrice(band(1000, 2000, 5000), NO_MODS, []);
    expect(r).toHaveProperty("min");
    expect(r).toHaveProperty("anchor");
    expect(r).toHaveProperty("max");
    expect(r).toHaveProperty("modifiers");
    expect(r).toHaveProperty("personal_weight");
    expect(r.modifiers).toHaveProperty("urgency");
    expect(r.modifiers).toHaveProperty("client_type");
    expect(r.modifiers).toHaveProperty("ip");
    expect(r.modifiers).toHaveProperty("complexity");
  });
});
