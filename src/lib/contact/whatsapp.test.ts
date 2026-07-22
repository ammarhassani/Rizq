import { describe, it, expect } from "vitest";
import { toWaNumber, waLink } from "./whatsapp";

describe("toWaNumber", () => {
  it("converts a Saudi local mobile (05XXXXXXXX) to international", () => {
    expect(toWaNumber("0512345678")).toBe("966512345678");
  });
  it("converts a 9-digit mobile without trunk 0 (5XXXXXXXX)", () => {
    expect(toWaNumber("512345678")).toBe("966512345678");
  });
  it("keeps an already-international number (966…)", () => {
    expect(toWaNumber("966512345678")).toBe("966512345678");
  });
  it("strips a leading + and formatting", () => {
    expect(toWaNumber("+966 51 234 5678")).toBe("966512345678");
    expect(toWaNumber("+966-51-234-5678")).toBe("966512345678");
  });
  it("strips a 00 international prefix", () => {
    expect(toWaNumber("00966512345678")).toBe("966512345678");
  });
  it("returns null for empty/garbage", () => {
    expect(toWaNumber(null)).toBeNull();
    expect(toWaNumber("")).toBeNull();
    expect(toWaNumber("abc")).toBeNull();
  });
});

describe("waLink", () => {
  it("builds a valid wa.me link for a local number (the bug fix)", () => {
    expect(waLink("0512345678")).toBe("https://wa.me/966512345678");
  });
  it("never produces a link with a leading 0 (invalid for wa.me)", () => {
    const link = waLink("0512345678")!;
    expect(link).not.toMatch(/wa\.me\/0/);
  });
  it("returns null when there is no number", () => {
    expect(waLink(null)).toBeNull();
  });
});
