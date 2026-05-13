"use client";

import { useEffect, type ReactNode } from "react";
import posthog from "posthog-js";
import { usePathname } from "next/navigation";

/**
 * Initializes PostHog once on first client mount and captures pageviews on
 * route change. No-op when env vars are unset, so this is safe to render
 * unconditionally even before you've configured PostHog.
 */
export function PostHogProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const host = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";
    if (!key) return;
    if (typeof window === "undefined") return;
    // Guard against double-init (StrictMode, fast-refresh)
    if ((window as unknown as { __ph_init?: boolean }).__ph_init) return;
    (window as unknown as { __ph_init?: boolean }).__ph_init = true;

    posthog.init(key, {
      api_host: host,
      person_profiles: "identified_only",
      capture_pageview: false, // we do it manually below to control timing
      capture_pageleave: true,
    });
  }, []);

  // Manual pageview on every route change
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return;
    if (typeof window === "undefined") return;
    posthog.capture("$pageview", { $current_url: window.location.href });
  }, [pathname]);

  return <>{children}</>;
}
