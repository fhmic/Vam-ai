import * as Sentry from "@sentry/nextjs";

/**
 * Stage 5.4 — Observability (edge runtime).
 *
 * Covers `middleware.ts` and any route handler that opts into
 * `export const runtime = "edge"`. Kept as a separate config from
 * `sentry.server.config.ts` because the edge runtime is a stricter
 * JS environment (no Node APIs) — this is the file the Sentry Next.js
 * SDK expects for that runtime and it is intentionally minimal.
 */
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
  tracesSampleRate: process.env.SENTRY_TRACES_SAMPLE_RATE
    ? Number(process.env.SENTRY_TRACES_SAMPLE_RATE)
    : 0.1,
  debug: false,
});
