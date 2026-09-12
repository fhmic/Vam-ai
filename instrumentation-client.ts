import * as Sentry from "@sentry/nextjs";

/**
 * Stage 5.4 — Observability (browser runtime).
 *
 * `NEXT_PUBLIC_SENTRY_DSN` (not `SENTRY_DSN`) — this file ships to the
 * browser, so only the `NEXT_PUBLIC_`-prefixed var is available. The
 * DSN itself is not a secret (Sentry's own docs treat it as public;
 * write access is gated by project settings, not by hiding the DSN),
 * so this is safe to expose.
 */
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,
  tracesSampleRate: process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE
    ? Number(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE)
    : 0.1,

  // Session Replay is a paid-plan feature and off by default on most
  // Sentry plans; keep sample rates at 0 so this stays a no-op until
  // someone deliberately opts in rather than silently recording users.
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,

  debug: false,
});

/**
 * Required by the Sentry Next.js SDK to instrument client-side route
 * transitions (App Router navigations) for performance tracing. A
 * plain re-export, not custom logic — Next.js calls this by name.
 */
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
