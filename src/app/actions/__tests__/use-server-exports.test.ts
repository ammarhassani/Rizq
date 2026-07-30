import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * A `"use server"` module may export ONLY async functions. Next.js turns anything else into a
 * build error at the module, and because server actions are imported by the components that call
 * them, that error takes down every route in the import graph — not just the feature that owns it.
 *
 * This is not theoretical. `export const PROPOSAL_CONTRIBUTION_CONFIDENCE = 0.4` in
 * `contributeBenchmarkFromProposal.ts` reached `finalizeProposal`, and every authenticated route
 * returned HTTP 500: 37 of 104 e2e tests failed at once. `pnpm typecheck` was clean throughout —
 * TypeScript has no opinion about Next.js's directive rules, so the guard has to be a test.
 *
 * Constants belong in a plain module (`lib/`), imported BY the action.
 */

const SRC = join(process.cwd(), "src");

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(entry)) out.push(full);
  }
  return out;
}

/** Type-only exports are erased before Next.js sees the module, so they are allowed. */
const TYPE_EXPORT = /^export\s+(type|interface)\b/;
const ASYNC_FUNCTION = /^export\s+(default\s+)?async\s+function\b/;
const ASYNC_CONST = /^export\s+const\s+\w+\s*(:[^=]+)?=\s*async\b/;

describe('"use server" modules export only async functions', () => {
  const serverModules = walk(SRC).filter((f) =>
    /^\s*["']use server["']/.test(readFileSync(f, "utf8"))
  );

  it("finds the server-action modules to check", () => {
    expect(serverModules.length).toBeGreaterThan(0);
  });

  it.each(serverModules)("%s", (file) => {
    const offenders = readFileSync(file, "utf8")
      .split(/\r?\n/)
      .map((line, i) => ({ line: line.trimEnd(), n: i + 1 }))
      .filter(
        ({ line }) =>
          /^export\b/.test(line) &&
          !TYPE_EXPORT.test(line) &&
          !ASYNC_FUNCTION.test(line) &&
          !ASYNC_CONST.test(line)
      )
      .map(({ line, n }) => `${n}: ${line}`);

    expect(
      offenders,
      `${file} is a "use server" module, so it may only export async functions. ` +
        `Move these to a plain module under src/lib/ and import them here.`
    ).toEqual([]);
  });
});
