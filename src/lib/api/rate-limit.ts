import "server-only";
import { NextResponse } from "next/server";

/**
 * Stage 6.1 — Rate limiting.
 *
 * A fixed-window, per-key counter kept in a module-level `Map`. This is
 * the "thin in-memory limiter" the roadmap explicitly calls out as
 * acceptable for soft launch: it is correct and sufficient for a
 * single long-lived server process, and it fails safely (open, not
 * closed — see below) once traffic is spread across multiple
 * serverless instances.
 *
 * Known limitation, on purpose: on Vercel, each serverless function
 * instance has its own memory, so a user's requests can land on
 * different instances and each will maintain its own counter — the
 * effective limit is "the configured limit, per warm instance" rather
 * than a single global count. That underenforces (lets through
 * somewhat more than the nominal limit) rather than overenforces
 * (never wrongly blocks a legitimate user because two instances
 * disagree). For a hard, cross-instance-accurate limit, swap this
 * module's internals for Vercel KV / Upstash Redis behind the same
 * `checkRateLimit` signature — every call site below only depends on
 * that signature, not on the in-memory storage.
 */

interface WindowState {
  count: number;
  windowStartedAt: number;
}

export interface RateLimitConfig {
  /** Max requests allowed within `windowMs`, per key. */
  limit: number;
  /** Fixed-window size in milliseconds. */
  windowMs: number;
}

export type RateLimitResult =
  | { allowed: true; remaining: number; resetAt: number }
  | { allowed: false; retryAfterSeconds: number; resetAt: number };

const buckets = new Map<string, WindowState>();

// Cheap unbounded-growth guard: entries only ever get read/written on
// the request path for a user who is actually making requests, so a
// sweep triggered by call volume (rather than a separate timer that
// would need its own lifecycle) is enough to bound memory in a
// long-lived dev server or a warm serverless instance.
const SWEEP_EVERY_N_CALLS = 500;
let callsSinceSweep = 0;

function sweepExpired(now: number) {
  for (const [key, state] of buckets) {
    // A window is stale once it's more than one full window old — safe
    // to drop even for a key we might see again, since the next call
    // for that key just starts a fresh window.
    if (now - state.windowStartedAt > 24 * 60 * 60 * 1000) {
      buckets.delete(key);
    }
  }
}

/**
 * @param key A string that uniquely identifies the caller *and* the
 *   endpoint being limited, e.g. `` `chat:${userId}` ``. Callers must
 *   namespace by endpoint themselves — this module has no notion of
 *   "the chat limit" vs "the voice limit", only of whatever key you
 *   pass it — so the exported per-endpoint configs below exist to
 *   keep the namespace prefixes and thresholds in one place rather
 *   than duplicated at every call site.
 */
export function checkRateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now();

  callsSinceSweep += 1;
  if (callsSinceSweep >= SWEEP_EVERY_N_CALLS) {
    callsSinceSweep = 0;
    sweepExpired(now);
  }

  const existing = buckets.get(key);

  if (!existing || now - existing.windowStartedAt >= config.windowMs) {
    buckets.set(key, { count: 1, windowStartedAt: now });
    return { allowed: true, remaining: config.limit - 1, resetAt: now + config.windowMs };
  }

  const resetAt = existing.windowStartedAt + config.windowMs;

  if (existing.count >= config.limit) {
    return { allowed: false, retryAfterSeconds: Math.ceil((resetAt - now) / 1000), resetAt };
  }

  existing.count += 1;
  return { allowed: true, remaining: config.limit - existing.count, resetAt };
}

/** Only exported for tests — resets all limiter state between cases. */
export function __resetRateLimitStateForTests(): void {
  buckets.clear();
  callsSinceSweep = 0;
}

/**
 * Builds the 429 response for a rejected `RateLimitResult`. Centralized
 * so every route returns the same error shape as the rest of the API
 * (`{ error: { code, message } }`) plus a standards-compliant
 * `Retry-After` header, rather than each route re-deriving both.
 */
export function rateLimitResponse(
  result: Extract<RateLimitResult, { allowed: false }>,
): NextResponse {
  return NextResponse.json(
    {
      error: {
        code: "RATE_LIMITED",
        message: "Too many requests. Please slow down and try again shortly.",
      },
    },
    {
      status: 429,
      headers: { "Retry-After": String(result.retryAfterSeconds) },
    },
  );
}

// Thresholds from ROADMAP.md Stage 6.1. Kept together so the numbers
// are reviewable in one place instead of scattered across route files.
export const CHAT_RATE_LIMIT: RateLimitConfig = { limit: 60, windowMs: 60 * 60 * 1000 };
export const VOICE_RATE_LIMIT: RateLimitConfig = { limit: 100, windowMs: 60 * 60 * 1000 };
export const ASSESSMENT_RATE_LIMIT: RateLimitConfig = { limit: 5, windowMs: 24 * 60 * 60 * 1000 };
export const REMATCH_RATE_LIMIT: RateLimitConfig = { limit: 3, windowMs: 24 * 60 * 60 * 1000 };
