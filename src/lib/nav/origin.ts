/**
 * Navigation origin (feature 005, Guided Project Mode).
 *
 * A tiny, URL-borne convention so a screen knows *where it was opened from* and
 * *where "back" should return* — without server/global state. Pure + total.
 *
 *   ?from=project:{uuid}   navigation origin (v1: only `project`)
 *   ?guided=1              an active guided run (independent of `from`)
 *
 * Absent `from` ⇒ standalone ⇒ unchanged behaviour. URL-driven ⇒ refresh / back /
 * forward / deep-link safe. Typed prefix leaves room for `client:{id}` later.
 */

export type NavigationOrigin = { type: "project"; id: string };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Parse the `from` search param. Returns null on missing / malformed / unknown-type / bad uuid. */
export function parseOrigin(
  sp: { from?: string | string[] | undefined } | null | undefined
): NavigationOrigin | null {
  if (!sp) return null;
  const raw = Array.isArray(sp.from) ? sp.from[0] : sp.from;
  if (!raw || typeof raw !== "string") return null;
  const idx = raw.indexOf(":");
  if (idx < 0) return null;
  const type = raw.slice(0, idx);
  const id = raw.slice(idx + 1);
  if (type !== "project") return null;
  if (!UUID_RE.test(id)) return null;
  return { type: "project", id };
}

export function serializeOrigin(origin: NavigationOrigin): string {
  return `${origin.type}:${origin.id}`;
}

/** Append `from` / `guided` to a target href, preserving any existing query string. */
export function withOrigin(href: string, origin?: NavigationOrigin | null, guided?: boolean): string {
  const params: string[] = [];
  if (origin) params.push(`from=${encodeURIComponent(serializeOrigin(origin))}`);
  if (guided) params.push("guided=1");
  if (params.length === 0) return href;
  const sep = href.includes("?") ? "&" : "?";
  return `${href}${sep}${params.join("&")}`;
}

export type BackTarget = { href: string; label: string };

/**
 * Resolve the back/return target. With a project origin → the project pane
 * (+ optional tab/guided) labeled with the project (title or generic). Without
 * an origin → the screen's default list (today's behaviour).
 */
export function resolveBack(
  origin: NavigationOrigin | null,
  opts: {
    fallbackHref: string;
    fallbackLabel: string;
    projectLabel: string;
    tab?: string;
    guided?: boolean;
  }
): BackTarget {
  if (origin?.type === "project") {
    let href = `/projects/${origin.id}`;
    const params: string[] = [];
    if (opts.tab) params.push(`tab=${encodeURIComponent(opts.tab)}`);
    if (opts.guided) params.push("guided=1");
    if (params.length) href += `?${params.join("&")}`;
    return { href, label: opts.projectLabel };
  }
  return { href: opts.fallbackHref, label: opts.fallbackLabel };
}
