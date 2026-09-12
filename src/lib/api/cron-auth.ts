import "server-only";
import { timingSafeEqual } from "node:crypto";

/**
 * Stage 5 — shared internal-route authentication.
 *
 * Every route under `/api/internal/*` (purge-deleted-accounts,
 * memory-consolidate, future voice-cleanup, etc.) accepts the same
 * shared-secret bearer token. The token is `INTERNAL_CRON_SECRET` on
 * both Vercel and any local caller; Vercel cron jobs send it
 * automatically as `Authorization: Bearer <value>` when the project's
 * CRON_SECRET env var is set.
 *
 * `timingSafeEqual` is required — a naive `===` comparison leaks the
 * length of the expected secret through response-time differences,
 * which is a (small) side-channel we don't need to accept.
 *
 * Returns false (does not throw) on every failure mode: missing env,
 * missing header, wrong length, wrong bytes. The route can then
 * uniformly 401 without leaking *which* check failed.
 */
export function hasValidCronSecret(request: Request): boolean {
  const expected = process.env.INTERNAL_CRON_SECRET;
  if (!expected) return false;

  const provided = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!provided) return false;

  const expectedBuffer = Buffer.from(expected);
  const providedBuffer = Buffer.from(provided);

  // Length check first — timingSafeEqual throws on length mismatch, and
  // we still want a constant-time response in that case.
  if (expectedBuffer.length !== providedBuffer.length) return false;

  return timingSafeEqual(expectedBuffer, providedBuffer);
}
