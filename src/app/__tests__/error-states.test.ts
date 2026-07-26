/**
 * Error ≠ empty (Principle V) for the four pages that read a list server-side:
 * methodology (M7), calendar (M9), documents (M12) and projects.
 *
 * A failed read must render WidgetError (message + retry) and NOT the
 * "you have nothing yet" call-to-action; a successful read with zero rows must
 * render the CTA and NOT WidgetError. Otherwise an outage tells the freelancer
 * their data is gone.
 *
 * These are server components, so the failure is injected at the Supabase
 * client — Playwright can't fail a server-side fetch from the browser. Nothing
 * is rendered: the page returns a React element tree and we inspect it
 * directly, which needs no DOM and no test-only hook in product code.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Module mocks ────────────────────────────────────────────────────────────
// next-intl's client navigation deep-imports `next/navigation` in a way vitest
// can't resolve; mocking @/i18n/navigation keeps that chain out of the test.
vi.mock("@/i18n/navigation", () => ({
  Link: "a",
  getPathname: () => "/login",
  useRouter: () => ({ refresh: () => {} }),
  redirect: () => {},
}));
// t(key) returns the key, so assertions can look for the key of the empty-state copy.
vi.mock("next-intl/server", () => ({
  getTranslations: async () => (k: string) => k,
  setRequestLocale: () => {},
}));
vi.mock("next-intl", () => ({
  hasLocale: () => true,
  useTranslations: () => (k: string) => k,
}));

const listProjects = vi.fn();
vi.mock("@/app/actions/projects/listProjects", () => ({
  listProjects: () => listProjects(),
}));

const createClient = vi.fn();
vi.mock("@/lib/supabase/server", () => ({ createClient: () => createClient() }));

// ─── Supabase stub ───────────────────────────────────────────────────────────

type Mode = "ok" | "error" | "throws";

/**
 * Chainable query-builder stub. Every method returns itself; awaiting it
 * resolves to `{ data, error }`. `failTable` decides which table misbehaves so
 * the unrelated reads on the same page still succeed.
 */
function stubSupabase(failTable: string, mode: Mode, rows: unknown[] = []) {
  const make = (result: { data: unknown; error: unknown }) => {
    const builder: Record<string, unknown> = new Proxy(
      {},
      {
        get(_t, prop) {
          if (prop === "then") return (res: (v: unknown) => void) => res(result);
          if (prop === "maybeSingle") return async () => result;
          return () => builder;
        },
      }
    );
    return builder;
  };

  return {
    from: (table: string) => {
      if (table !== failTable) return make({ data: rows, error: null });
      if (mode === "throws") throw new Error("network blip");
      if (mode === "error") return make({ data: null, error: { code: "PGRST301", message: "boom" } });
      return make({ data: rows, error: null });
    },
    auth: { getUser: async () => ({ data: { user: { id: "u-1" } } }) },
  };
}

// ─── React element-tree inspection (no rendering) ────────────────────────────

type Tree = { names: string[]; strings: string[] };

function walk(node: unknown, out: Tree): void {
  if (node == null || typeof node === "boolean") return;
  if (typeof node === "string" || typeof node === "number") {
    out.strings.push(String(node));
    return;
  }
  if (Array.isArray(node)) {
    for (const child of node) walk(child, out);
    return;
  }
  if (typeof node === "object" && "type" in (node as Record<string, unknown>)) {
    const el = node as { type: unknown; props?: Record<string, unknown> };
    const t = el.type as { displayName?: string; name?: string } | string;
    out.names.push(typeof t === "string" ? t : t?.displayName || t?.name || "?");
    for (const value of Object.values(el.props ?? {})) walk(value, out);
  }
}

async function inspect(page: (args: { params: Promise<{ locale: string }> }) => Promise<unknown>) {
  const out: Tree = { names: [], strings: [] };
  walk(await page({ params: Promise.resolve({ locale: "en" }) }), out);
  return out;
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── Cases ───────────────────────────────────────────────────────────────────
// `emptyKey` is the translation key of the empty-state copy the page shows when
// the read succeeds with zero rows. Calendar has no empty state (its client
// island renders an empty month), so it asserts on the island instead.

const CASES = [
  {
    name: "methodology (M7)",
    table: "methodology_sections",
    load: () => import("../[locale]/methodology/page"),
    emptyKey: null,
    okComponent: null,
  },
  {
    name: "calendar (M9)",
    table: "calendar_events",
    load: () => import("../[locale]/calendar/page"),
    emptyKey: null,
    okComponent: "CalendarClient",
  },
  {
    name: "documents (M12)",
    table: "documents",
    load: () => import("../[locale]/documents/page"),
    emptyKey: "noDocumentsTitle",
    okComponent: null,
  },
] as const;

// The first dynamic import in each case pulls a whole Next server page's module graph in.
// Under the full suite that transform competes with every other worker and can exceed the
// 5s default — a cost of loading, not of anything under test.
const IMPORT_TIMEOUT_MS = 30_000;

describe.each(CASES)("$name", ({ table, load, emptyKey, okComponent }) => {
  it.each(["error", "throws"] as const)("read fails (%s) → error + retry, no empty CTA", { timeout: IMPORT_TIMEOUT_MS }, async (mode) => {
    createClient.mockResolvedValue(stubSupabase(table, mode));
    const { default: page } = await load();
    const { names, strings } = await inspect(page as never);

    expect(names).toContain("WidgetError");
    if (emptyKey) expect(strings).not.toContain(emptyKey);
    if (okComponent) expect(names).not.toContain(okComponent);
  });

  it("read succeeds with zero rows → empty state, no error", { timeout: IMPORT_TIMEOUT_MS }, async () => {
    createClient.mockResolvedValue(stubSupabase(table, "ok", []));
    const { default: page } = await load();
    const { names, strings } = await inspect(page as never);

    expect(names).not.toContain("WidgetError");
    if (emptyKey) expect(strings).toContain(emptyKey);
    if (okComponent) expect(names).toContain(okComponent);
  });
});

describe("projects", () => {
  const load = () => import("../[locale]/projects/page");

  it.each([
    ["result not ok", () => Promise.resolve({ ok: false, error: "read_failed" })],
    ["thrown", () => Promise.reject(new Error("network blip"))],
  ])("list fails (%s) → error + retry, no empty CTA", async (_label, impl) => {
    createClient.mockResolvedValue(stubSupabase("__none__", "ok"));
    listProjects.mockImplementation(impl);
    const { default: page } = await load();
    const { names, strings } = await inspect(page as never);

    expect(names).toContain("WidgetError");
    expect(strings).not.toContain("indexEmptyTitle");
  });

  it("list succeeds with zero rows → empty state, no error", async () => {
    createClient.mockResolvedValue(stubSupabase("__none__", "ok"));
    listProjects.mockResolvedValue({ ok: true, items: [] });
    const { default: page } = await load();
    const { names, strings } = await inspect(page as never);

    expect(names).not.toContain("WidgetError");
    expect(strings).toContain("indexEmptyTitle");
  });
});
