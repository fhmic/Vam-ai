import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasValidCronSecret } from "@/lib/api/cron-auth";
import { getOrCreateRequestId, requestIdHeaders } from "@/lib/api/request-id";
import { consolidateMemoriesIfNeeded, CONSOLIDATION_THRESHOLD } from "@/lib/memory/consolidation";
import { reportApiError } from "@/lib/observability/error-reporting";

/**
 * Hard cap on users processed per cron invocation. Sized so the run
 * stays well under Vercel Hobby's 10s function timeout even in the
 * pathological case (each consolidation is an AI provider call + two DB
 * writes; ~25 users finishes in <8s on the smallest tier in practice).
 * Remaining users get picked up on the next nightly run, which is
 * fine — consolidation is best-effort, not real-time.
 */
const MAX_USERS_PER_RUN = 25;

/**
 * Called by Vercel cron at 03:00 UTC daily (see vercel.json). Iterates
 * users whose active (non-superseded) memory_items count is over
 * CONSOLIDATION_THRESHOLD and asks consolidateMemoriesIfNeeded to roll
 * their items up into episodic_summary rows. The next cron tick picks
 * up the next batch if there are more.
 *
 * Auth: same INTERNAL_CRON_SECRET as the purge-deleted-accounts cron.
 */
export async function GET(request: Request) {
  const requestId = getOrCreateRequestId(request);

  if (!hasValidCronSecret(request)) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Invalid cron authorization" } },
      { status: 401, headers: requestIdHeaders(requestId) },
    );
  }

  const utilityModel = process.env.GEMINI_MODEL_UTILITY;
  if (!utilityModel) {
    return NextResponse.json(
      { error: { code: "UPSTREAM_ERROR", message: "GEMINI_MODEL_UTILITY is not configured" } },
      { status: 502, headers: requestIdHeaders(requestId) },
    );
  }

  const admin = createAdminClient();

  // Find candidate users: anyone with more than CONSOLIDATION_THRESHOLD
  // active memory items. We can't use GROUP BY + HAVING over a jsonb
  // relationship cleanly from the client SDK, so we do it in two steps:
  //   1. Pull distinct user_ids with non-superseded items from a
  //      bounded recent window (last 500 rows is plenty — consolidation
  //      only matters for users with lots of memory, who generate
  //      memory often).
  //   2. Filter in JS to the ones actually over the threshold by
  //      re-querying their active counts.
  const { data: recentOwners, error: ownersError } = await admin
    .from("memory_items")
    .select("user_id")
    .is("superseded_by", null)
    .order("created_at", { ascending: false })
    .limit(500);

  if (ownersError) {
    return NextResponse.json(
      { error: { code: "UPSTREAM_ERROR", message: ownersError.message } },
      { status: 502, headers: requestIdHeaders(requestId) },
    );
  }

  const uniqueUserIds = Array.from(new Set((recentOwners ?? []).map((r) => r.user_id))).slice(0, 200);

  // Re-count per user in parallel; cheap, indexed, no auth context.
  const counts = await Promise.all(
    uniqueUserIds.map(async (userId) => {
      const { count, error } = await admin
        .from("memory_items")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .is("superseded_by", null);
      return { userId, count: error ? 0 : (count ?? 0) };
    }),
  );

  const candidates = counts
    .filter((c) => c.count > CONSOLIDATION_THRESHOLD)
    .sort((a, b) => b.count - a.count) // biggest offenders first
    .slice(0, MAX_USERS_PER_RUN);

  let consolidatedUsers = 0;
  let summariesCreated = 0;
  const failures: Array<{ userId: string; message: string }> = [];

  for (const { userId } of candidates) {
    try {
      const result = await consolidateMemoriesIfNeeded({ userId, utilityModel });
      if (result.consolidated) {
        consolidatedUsers += 1;
        summariesCreated += result.summaryCount;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      reportApiError(err, { route: "internal/memory-consolidate", requestId, userId });
      failures.push({ userId, message });
    }
  }

  return NextResponse.json(
    {
      scannedUsers: uniqueUserIds.length,
      candidates: candidates.length,
      consolidatedUsers,
      summariesCreated,
      failures,
    },
    { headers: requestIdHeaders(requestId) },
  );
}
