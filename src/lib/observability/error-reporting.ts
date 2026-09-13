import "server-only";
import * as Sentry from "@sentry/nextjs";

/**
 * Stage 5.4 — Observability.
 *
 * `instrumentation.ts` / `onRequestError` catches errors Next itself
 * sees escape a route handler unhandled. Every API route in this
 * codebase, though, already wraps its body in try/catch so it can
 * return a well-shaped `{ error: { code, message } }` JSON body
 * instead of a raw 500 — which means the error is *handled*, and
 * would otherwise never reach Sentry at all. `reportApiError` is the
 * explicit capture call each of those catch blocks makes, so a real
 * upstream failure (the AI provider down, a Supabase write failing) still shows
 * up in Sentry with the request's `requestId` attached, instead of
 * only ever being visible in whichever client happened to be looking
 * at devtools when it failed.
 *
 * Safe to call with no `SENTRY_DSN` configured (local dev, a fresh
 * checkout, CI) — `Sentry.captureException` is a no-op in that case,
 * matching the "observability is additive, never load-bearing"
 * property the rest of this file's callers depend on.
 */
export function reportApiError(
  err: unknown,
  context: { route: string; requestId?: string; userId?: string },
): void {
  Sentry.captureException(err, {
    tags: { route: context.route },
    extra: { requestId: context.requestId, userId: context.userId },
  });
}
