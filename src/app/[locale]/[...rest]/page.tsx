import { notFound } from "next/navigation";

/**
 * Catch-all for URLs no real route matches inside a locale.
 *
 * `not-found.tsx` only renders when a segment actually calls `notFound()`. Without
 * this file an unmatched path (e.g. `/ar/does-not-exist`) never reaches a route at
 * all, so Next serves its own built-in English "This page could not be found" —
 * outside the app shell, outside the brand, and in the wrong language for an
 * Arabic-first product.
 *
 * Static and dynamic segments both take precedence over a catch-all, so this only
 * fires once every real route has declined the URL. It hands off to
 * `[locale]/not-found.tsx`, which keeps a signed-in freelancer inside the app shell.
 */
export default function LocaleCatchAll() {
  notFound();
}
