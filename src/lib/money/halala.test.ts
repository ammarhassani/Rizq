import { describe, it, expect } from "vitest";
import { roundHalala, clampMoneyInput } from "./halala";

describe("clampMoneyInput", () => {
  it("truncates a third decimal as it is typed", () => {
    expect(clampMoneyInput("10450.555")).toBe("10450.55");
  });

  it("leaves two or fewer decimals untouched", () => {
    expect(clampMoneyInput("10450.55")).toBe("10450.55");
    expect(clampMoneyInput("10450.5")).toBe("10450.5");
    expect(clampMoneyInput("10450")).toBe("10450");
  });

  it("leaves partial input alone so typing still works", () => {
    expect(clampMoneyInput("")).toBe("");
    expect(clampMoneyInput("10.")).toBe("10.");
    expect(clampMoneyInput(".")).toBe(".");
  });

  it("never rounds up — the price only ever moves toward the payer", () => {
    expect(clampMoneyInput("9.999")).toBe("9.99");
  });
});

describe("the printed unit price and the printed line total agree", () => {
  /** What the invoice shows: money rendered to at most two decimals. */
  const shown = (n: number) =>
    new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(n);

  /** What a client gets if they multiply the printed unit price themselves. */
  const clientMath = (printedUnit: string, quantity: number) =>
    shown(Number(printedUnit.replace(/,/g, "")) * quantity);

  it("regression: 10450.555 × 3 printed a total the client could not reproduce", () => {
    const raw = 10450.555;
    const quantity = 3;

    // Before: the unit price printed as 10,450.56 while the total was computed on the
    // unrounded 10450.555 → 31,351.67. The client multiplying what they can see gets
    // 31,351.68 and asks which number is the real one.
    expect(clientMath(shown(raw), quantity)).not.toBe(shown(raw * quantity));

    // After: entry is halala-precise, so what is printed is what was multiplied.
    const entered = Number(clampMoneyInput(String(raw)));
    expect(entered).toBe(10450.55);
    expect(clientMath(shown(entered), quantity)).toBe(shown(roundHalala(entered * quantity)));
  });

  it("holds for a range of quantities", () => {
    const entered = Number(clampMoneyInput("1234.567"));
    for (const q of [1, 2, 3, 7, 12]) {
      expect(clientMath(shown(entered), q)).toBe(shown(roundHalala(entered * q)));
    }
  });
});

describe("roundHalala", () => {
  it("rounds to two decimals", () => {
    expect(roundHalala(31351.665)).toBe(31351.67);
    expect(roundHalala(0.005)).toBe(0.01);
    expect(roundHalala(1000)).toBe(1000);
  });

  it("is safe with non-finite input", () => {
    expect(roundHalala(Number.NaN)).toBe(0);
    expect(roundHalala(Number.POSITIVE_INFINITY)).toBe(0);
  });
});
