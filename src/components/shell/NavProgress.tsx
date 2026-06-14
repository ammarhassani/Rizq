"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";

/**
 * NavProgress — thin brand-green top progress bar that gives immediate
 * "something is happening" feedback on in-app navigation.
 *
 * Why this design: AppShell is a per-page wrapper (not a persistent route-group
 * layout), so a single bar instance can't span the whole navigation. Instead we
 * use TWO signals that together cover the full click→paint window:
 *
 *   1. In-flight (start): a capture-phase click listener on internal <a> links
 *      trips the bar the instant a link is clicked. It "trickles" toward ~85%
 *      while the next route is being prepared (server components stream in).
 *      This is the feedback for the gap the founder complained about.
 *
 *   2. Arrival (finish): when the new shell mounts (new page committed), this
 *      fresh instance animates a quick fill to 100% and fades out — the bar the
 *      user sees "complete" as the page appears.
 *
 * Reduced-motion: renders nothing (the CSS guard would neutralize the transition
 * anyway, and a non-animating bar is just noise). Decorative → aria-hidden.
 */
export function NavProgress() {
  const reduce = useReducedMotion();

  // null = hidden. 0..100 = visible at that width.
  const [progress, setProgress] = useState<number | null>(null);
  const [fading, setFading] = useState(false);
  const trickleRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // ── Arrival: this instance just mounted → the new page is here. Quick fill. ──
  useEffect(() => {
    if (reduce) return;
    // Start near-complete and finish, so the bar reads as "loading just ended".
    setFading(false);
    setProgress(82);
    const t1 = setTimeout(() => setProgress(100), 80);
    const t2 = setTimeout(() => setFading(true), 260);
    const t3 = setTimeout(() => {
      setProgress(null);
      setFading(false);
    }, 560);
    timersRef.current.push(t1, t2, t3);
    return () => {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    };
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── In-flight: trip the bar the moment an internal link is clicked. ──────────
  useEffect(() => {
    if (reduce) return;

    function startTrickle() {
      if (trickleRef.current) return;
      setFading(false);
      setProgress((p) => (p == null || p >= 100 ? 12 : p));
      trickleRef.current = setInterval(() => {
        setProgress((p) => {
          const cur = p ?? 12;
          if (cur >= 88) return cur; // hold near the top until arrival
          // ease the trickle: slower as it approaches the ceiling
          return cur + Math.max(0.5, (88 - cur) * 0.08);
        });
      }, 120);
    }

    function stopTrickle() {
      if (trickleRef.current) {
        clearInterval(trickleRef.current);
        trickleRef.current = null;
      }
    }

    function onClick(e: MouseEvent) {
      // Ignore modified clicks / non-primary buttons (new tab, etc.)
      if (e.defaultPrevented) return;
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const target = e.target as Element | null;
      const anchor = target?.closest?.("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href) return;

      // Only internal, same-tab, real navigations.
      if (
        anchor.target === "_blank" ||
        anchor.hasAttribute("download") ||
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        /^https?:\/\//i.test(href)
      ) {
        return;
      }

      // Don't show for same-URL clicks.
      try {
        const dest = new URL(href, window.location.href);
        if (
          dest.pathname === window.location.pathname &&
          dest.search === window.location.search
        ) {
          return;
        }
      } catch {
        /* relative parse failed — proceed, it's internal */
      }

      startTrickle();
    }

    // Back/forward also navigate.
    function onPopState() {
      startTrickle();
    }

    document.addEventListener("click", onClick, { capture: true });
    window.addEventListener("popstate", onPopState);
    return () => {
      document.removeEventListener("click", onClick, { capture: true });
      window.removeEventListener("popstate", onPopState);
      stopTrickle();
    };
  }, [reduce]);

  if (reduce || progress == null) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-[2px]"
    >
      <div
        className="h-full bg-rizq-green shadow-[0_0_8px_rgba(26,95,63,0.5)]"
        style={{
          width: `${progress}%`,
          opacity: fading ? 0 : 1,
          transition:
            "width 180ms cubic-bezier(0.22,1,0.36,1), opacity 280ms ease-out",
        }}
      />
    </div>
  );
}
