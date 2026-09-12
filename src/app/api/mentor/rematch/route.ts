import { NextResponse } from "next/server";
import { verifyAuthenticatedUser } from "@/lib/supabase/auth-guard";
import { rematchMentor } from "@/lib/mentor/assignment";
import { checkRateLimit, rateLimitResponse, REMATCH_RATE_LIMIT } from "@/lib/api/rate-limit";
import { reportApiError } from "@/lib/observability/error-reporting";

/**
 * Stage 2.2 — Mentor Matching Engine.
 *
 * POST -> { changed: boolean, mentor: { slug, displayName, tagline } }
 *
 * Explicitly re-runs the matching engine and, if the result differs
 * from the user's current mentor, records a new assignment row (the
 * assignments table is append-only per migration 0013 — prior rows are
 * never deleted, so the full rematch history is preserved).
 *
 * `changed: false` means the matching engine re-ran and picked the
 * same mentor the user already has (matching is deterministic on
 * identical profile/preferences, so this is the expected result for
 * most users). The client uses this to decide whether to update the
 * displayed avatar/name (no-op when unchanged).
 *
 * Distinct from getOrAssignMentor's lazy first-assignment path used
 * by /api/chat, which never re-matches an already-assigned user on
 * its own.
 */
export async function POST() {
  const auth = await verifyAuthenticatedUser();
  if (!auth.ok) return auth.response;
  const { user } = auth.data;

  // Stage 6.1 — 3/day from ROADMAP.md.
  const rateLimit = checkRateLimit(`rematch:${user.id}`, REMATCH_RATE_LIMIT);
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit);

  try {
    const result = await rematchMentor(user.id);
    return NextResponse.json({
      changed: result.changed,
      mentor: {
        slug: result.mentor.slug,
        displayName: result.mentor.display_name,
        tagline: result.mentor.tagline,
      },
    });
  } catch (err) {
    reportApiError(err, { route: "mentor/rematch", userId: user.id });
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: { code: "UPSTREAM_ERROR", message } }, { status: 502 });
  }
}
