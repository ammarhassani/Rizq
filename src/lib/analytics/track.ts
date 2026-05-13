"use client";

import posthog from "posthog-js";

/**
 * Thin wrapper around posthog.capture that's safe to call when PostHog
 * isn't initialised (server-side or env unset). Use for product events
 * (signup, query_calculated, quota_exhausted, etc.).
 */
export function track(event: string, properties?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return;
  try {
    posthog.capture(event, properties);
  } catch {
    // Silent: analytics failures should never break product UX
  }
}

/**
 * Associate the current PostHog session with a user. Call once after login.
 */
export function identify(userId: string, traits?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return;
  try {
    posthog.identify(userId, traits);
  } catch {
    /* no-op */
  }
}

/**
 * Clear the identified user — call on logout.
 */
export function resetAnalytics() {
  if (typeof window === "undefined") return;
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return;
  try {
    posthog.reset();
  } catch {
    /* no-op */
  }
}
