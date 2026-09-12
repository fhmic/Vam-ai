import * as Sentry from "@sentry/nextjs";

/**
 * Stage 5.4 — Observability.
 *
 * Next's instrumentation hook runs once per server runtime instance,
 * before any request is handled. It is the supported place to load
 * Sentry's server/edge init (Sentry.init itself lives in the two
 * sibling config files so each stays a plain, runtime-appropriate
 * module rather than one file branching on `NEXT_RUNTIME`).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

/**
 * Captures errors thrown from React Server Components / nested layouts
 * that Next itself catches before they'd otherwise reach one of our
 * own try/catch blocks (see `src/lib/observability/error-reporting.ts`
 * for the explicit-capture path used inside API route handlers).
 */
export const onRequestError = Sentry.captureRequestError;
