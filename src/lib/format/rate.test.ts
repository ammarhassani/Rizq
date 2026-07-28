import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fmtRate } from "./number";

/**
 * A percentage printed beside Arabic text must be in the view's numerals.
 *
 * This class has now been fixed four times — passes 3, 4 and 6, then RZQ-0009 — because each
 * fix patched the surface someone happened to open. The invoice builder's own line was
 * invisible to the numeral sweep for a reason worth remembering: it only renders once VAT is
 * on, which needs a VAT-registered profile, which a swept account never has. A guard that
 * runs the app can only see the states it can reach; this one reads the source instead.
 *
 * Percentages inside a `style` value are CSS lengths, not text, and are ignored.
 */

const VISIBLE_PERCENT = /\{([^{}]+)\}\s*%/g;
const ALREADY_FORMATTED = /fmt[A-Z]|toArabicIndic|NumberFormat|\.format\(/;

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) sourceFiles(full, out);
    else if (/\.tsx$/.test(entry.name) && !/\.(test|spec)\.tsx$/.test(entry.name)) out.push(full);
  }
  return out;
}

/** A percent inside style={{ ... }} / a template literal fed to `style` is a CSS length. */
function isCssLength(line: string, index: number): boolean {
  const before = line.slice(0, index);
  return /style\s*=|width:|height:|left:|right:|top:|bottom:|inset|translate|insetInline/.test(
    before,
  );
}

describe("fmtRate", () => {
  it("renders the view's numerals", () => {
    expect(fmtRate(15, "ar")).toBe("١٥");
    expect(fmtRate(15, "en")).toBe("15");
  });

  it("keeps a fractional rate, drops a decorative zero", () => {
    expect(fmtRate(7.5, "ar")).toBe("٧٫٥");
    expect(fmtRate(7.5, "en")).toBe("7.5");
    expect(fmtRate(15, "en")).toBe("15");
  });
});

describe("no view prints a raw percentage beside Arabic text", () => {
  const offenders: string[] = [];

  for (const file of sourceFiles(path.resolve(__dirname, "../.."))) {
    readFileSync(file, "utf8")
      .split("\n")
      .forEach((line, i) => {
        for (const match of line.matchAll(VISIBLE_PERCENT)) {
          if (ALREADY_FORMATTED.test(match[1]!)) continue;
          if (isCssLength(line, match.index ?? 0)) continue;
          offenders.push(`${path.relative(process.cwd(), file)}:${i + 1}  ${line.trim().slice(0, 90)}`);
        }
      });
  }

  it("formats every percentage it shows the freelancer", () => {
    expect(offenders).toEqual([]);
  });
});
