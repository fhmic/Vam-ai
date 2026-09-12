import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { pickBestMentor } from "@/lib/mentor/matching";
import type { Mentor } from "@/types/database";

/**
 * Returns the user's current mentor, assigning one via the matching
 * engine if they don't have one yet. Always uses the admin client —
 * callers must have already run verifyAuthenticatedUser() and pass in
 * the verified user's id, never a client-supplied id (same contract as
 * src/lib/legal/acceptance.ts).
 *
 * "Current mentor" = the mentor from the most recent row in
 * user_mentor_assignments (append-only, see migration 0013) — there is
 * intentionally no "active_mentor_id" column anywhere to keep a single
 * source of truth and a full history of re-matches.
 */
export async function getOrAssignMentor(userId: string): Promise<Mentor> {
  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("user_mentor_assignments")
    .select("mentor_id, mentors(*)")
    .eq("user_id", userId)
    .order("assigned_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing?.mentors) {
    return existing.mentors as unknown as Mentor;
  }

  return assignMentor(userId);
}

/**
 * Runs the matching engine against the user's current profile/
 * preferences and records a new assignment row. Called for a brand-new
 * user (via getOrAssignMentor) and available for an explicit "find a
 * new mentor" action later (e.g. after the user changes their primary
 * goal in settings).
 */
export async function assignMentor(userId: string): Promise<Mentor> {
  const admin = createAdminClient();

  const [
    { data: profile, error: profileError },
    { data: preferences, error: preferencesError },
    { data: mentors, error: mentorsError },
  ] = await Promise.all([
    admin
      .from("profiles")
      .select("career_level, primary_goal")
      .eq("id", userId)
      .single(),
    admin
      .from("user_preferences")
      .select("mentor_style, coaching_intensity")
      .eq("user_id", userId)
      .single(),
    admin.from("mentors").select("*").eq("is_active", true),
  ]);

  if (profileError || !profile) {
    throw new Error(`assignMentor: could not load profile for ${userId}: ${profileError?.message}`);
  }
  if (preferencesError || !preferences) {
    throw new Error(
      `assignMentor: could not load preferences for ${userId}: ${preferencesError?.message}`,
    );
  }
  if (mentorsError || !mentors || mentors.length === 0) {
    throw new Error(`assignMentor: no active mentors available: ${mentorsError?.message}`);
  }

  const match = pickBestMentor(mentors, {
    careerLevel: profile.career_level,
    primaryGoal: profile.primary_goal,
    mentorStyle: preferences.mentor_style,
    coachingIntensity: preferences.coaching_intensity,
  });

  const { error: insertError } = await admin.from("user_mentor_assignments").insert({
    user_id: userId,
    mentor_id: match.mentor.id,
    reason: match.reason,
  });

  if (insertError) {
    throw new Error(`assignMentor: failed to record assignment for ${userId}: ${insertError.message}`);
  }

  return match.mentor;
}

/**
 * Re-runs the matching engine and inserts a new assignment row — but
 * only if it would actually pick a different mentor than the user
 * currently has. Without the "different mentor only" guard, a rematch
 * request from a user whose profile perfectly fits their current
 * mentor would silently re-assign the same one (since matching is
 * deterministic on identical input — see pickBestMentor's tie-break
 * rules). That would be confusing UX ("I asked for a new mentor, got
 * the same one back, nothing changed") and would also pollute the
 * append-only assignment history with no-op rows.
 *
 * Returns:
 *   { changed: true,  mentor: Mentor } — a different mentor was selected
 *   { changed: false, mentor: Mentor } — current mentor already best-fit
 */
export async function rematchMentor(
  userId: string,
): Promise<{ changed: boolean; mentor: Mentor }> {
  const admin = createAdminClient();

  const { data: current } = await admin
    .from("user_mentor_assignments")
    .select("mentor_id")
    .eq("user_id", userId)
    .order("assigned_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Reuse the regular assign path: it handles all the same reads, just
  // additionally compares the result to the current mentor. Throwing on
  // a rematch where the data is missing would surface a real bug (we
  // can't decide what's "current" without a profile).
  const next = await assignMentor(userId);

  if (current?.mentor_id === next.id) {
    return { changed: false, mentor: next };
  }
  return { changed: true, mentor: next };
}
