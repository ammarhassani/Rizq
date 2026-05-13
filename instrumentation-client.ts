import * as Sentry from "@sentry/nextjs";

/**
 * Browser-side Sentry init. No-op when DSN is unset.
 */
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment:
      process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,
    // Light sampling — increase once we have traffic data
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0.5,
    sendDefaultPii: false,
  });
}

// Required by Next 16's instrumentation-client for navigation tracking
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
