import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Stage 2.6 — Progress Tracking.
 *
 * Records activity-derived metrics (source: 'activity') after each chat
 * turn. Assessment-derived snapshots (source: 'assessment') are not
 * part of Stage 2 — see docs/STAGE-2-3-4-NOTES.md — the schema already
 * distinguishes the two so adding that source later needs no migration.
 *
 * Two metrics for now, deliberately simple:
 *   total_messages  — running count of the user's messages, all-time
 *   day_streak      — consecutive calendar days (UTC) with at least
 *                     one message, ending today
 */
export async function recordActivitySnapshot(userId: string): Promise<void> {
  const admin = createAdminClient();

  const { count: totalMessages } = await admin
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("role", "user");

  const { data: recentDays } = await admin
    .from("messages")
    .select("created_at")
    .eq("user_id", userId)
    .eq("role", "user")
    .order("created_at", { ascending: false })
    .limit(200);

  const streak = computeDayStreak((recentDays ?? []).map((m) => m.created_at));

  const now = new Date().toISOString();
  await admin.from("progress_snapshots").insert([
    { user_id: userId, source: "activity", metric_key: "total_messages", metric_value: totalMessages ?? 0, recorded_at: now },
    { user_id: userId, source: "activity", metric_key: "day_streak", metric_value: streak, recorded_at: now },
  ]);
}

/**
 * Pure function — unit-testable without a database
 * (tests/unit/progress-streak.test.ts). Counts consecutive UTC calendar
 * days with at least one timestamp, walking backward from today.
 */
export function computeDayStreak(timestamps: string[], now: Date = new Date()): number {
  const days = new Set(timestamps.map((ts) => new Date(ts).toISOString().slice(0, 10)));

  let streak = 0;
  const cursor = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  for (;;) {
    const key = cursor.toISOString().slice(0, 10);
    if (!days.has(key)) break;
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  return streak;
}
