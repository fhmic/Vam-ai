import * as Sentry from "@sentry/nextjs";

/**
 * Stage 5.4 — Observability (server runtime).
 *
 * Loaded from `instrumentation.ts` only when `NEXT_RUNTIME === "nodejs"`.
 * `Sentry.init` is a safe no-op when `dsn` is undefined/empty — every
 * other env var check in this codebase (GROQ_MODEL_CHAT, etc.) fails
 * loudly at request time instead, but Sentry is explicitly the
 * exception: a developer running locally or a preview deploy without a
 * DSN configured should get a fully working app with observability
 * simply absent, not a crash.
 */
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,

  // Low default — this is a request/response API layer, not a service
  // we need full trace sampling on to diagnose latency. Raise this
  // (or set via env) once Stage 6 performance work needs trace data.
  tracesSampleRate: process.env.SENTRY_TRACES_SAMPLE_RATE
    ? Number(process.env.SENTRY_TRACES_SAMPLE_RATE)
    : 0.1,

  // Sentry's own SDK debug logging, not application debug logging.
  debug: false,
});
