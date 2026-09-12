import "server-only";
import { randomUUID } from "node:crypto";

/**
 * Stage 5 — request correlation.
 *
 * Every API response gets an `X-Request-Id` header. The id is generated
 * once at the top of the handler (or, for middleware-driven routes, by
 * the middleware) and reused for:
 *   - the response header (clients can quote it in bug reports)
 *   - any error logs emitted while handling the request
 *   - any nested upstream calls (forwarded as `X-Request-Id` to Groq
 *     fetch / Supabase RPC / etc., so the same id shows up in their logs)
 *
 * The format is a v4 UUID: cheap to generate, globally unique, and
 * matches what most log aggregators (Sentry, Logflare, Datadog) detect
 * automatically for grouping.
 *
 * Kept here as a tiny pure helper — no I/O, no Next coupling — so it
 * can be imported from middleware.ts (Edge) and from any route handler
 * (Node) without pulling in the rest of `@/lib/api`.
 */

export const REQUEST_ID_HEADER = "x-request-id";

/**
 * If the request came from an upstream proxy that already set
 * `X-Request-Id` (e.g. Vercel's automatic request id, or a
 * load-balancer hop), keep it so the id traces through the whole stack.
 * Otherwise mint a new one.
 */
export function getOrCreateRequestId(request: Request): string {
  const incoming = request.headers.get(REQUEST_ID_HEADER);
  if (incoming && incoming.length > 0 && incoming.length <= 200) {
    return incoming;
  }
  return randomUUID();
}

/**
 * Returns a plain `HeadersInit` object that callers can spread into
 * `new Response(...)` headers. Centralized so the header name lives in
 * one place and changing it later (e.g. to `request-id` without the
 * `X-` prefix per newer IETF conventions) is a single-file edit.
 */
export function requestIdHeaders(id: string): Record<string, string> {
  return { [REQUEST_ID_HEADER]: id };
}
