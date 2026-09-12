import type { Mentor, Profile, UserPreferences } from "@/types/database";

export interface MatchInput {
  careerLevel: Profile["career_level"];
  primaryGoal: Profile["primary_goal"];
  mentorStyle: UserPreferences["mentor_style"];
  coachingIntensity: UserPreferences["coaching_intensity"];
}

export interface MatchResult {
  mentor: Mentor;
  reason: string;
  score: number;
}

/**
 * Stage 2.2 — Mentor Matching Engine.
 *
 * Deterministic, explainable scoring — no ML/embedding step. Every score
 * component maps directly to a `reason` string so a match can always be
 * explained back to the user ("matched on your primary goal" etc.) and
 * so this function is fully unit-testable with plain objects (see
 * tests/unit/mentor-matching.test.ts) — no network or DB access needed.
 *
 * Weights, in order of how much signal they carry:
 *   +3  primary_goal is in the mentor's best_fit_goals
 *   +2  mentor_style preference matches the mentor's style exactly
 *   +1  coaching_intensity 'high' aligns with a 'challenging' mentor,
 *       or 'low' aligns with a 'supportive' mentor (mismatch: 0, not
 *       negative — a low-intensity user picking a supportive mentor
 *       isn't a bad fit, it's just not an extra-strong signal either)
 *
 * Ties are broken by mentor.slug (stable, deterministic ordering) so
 * the function never returns a different "best" mentor across two
 * calls with identical input.
 */
export function scoreMentor(mentor: Mentor, input: MatchInput): MatchResult {
  let score = 0;
  const reasons: string[] = [];

  if (input.primaryGoal && mentor.best_fit_goals.includes(input.primaryGoal)) {
    score += 3;
    reasons.push(`primary_goal:${input.primaryGoal}`);
  }

  if (input.mentorStyle === mentor.mentor_style) {
    score += 2;
    reasons.push(`mentor_style:${mentor.mentor_style}`);
  }

  const intensityAligned =
    (input.coachingIntensity === "high" && mentor.mentor_style === "challenging") ||
    (input.coachingIntensity === "low" && mentor.mentor_style === "supportive");
  if (intensityAligned) {
    score += 1;
    reasons.push(`coaching_intensity:${input.coachingIntensity}`);
  }

  return {
    mentor,
    score,
    reason: reasons.length > 0 ? reasons.join(",") : "default_fallback",
  };
}

/**
 * Picks the best-fit mentor from a list of active mentors. Falls back
 * to the first mentor (by slug, for determinism) if every score is 0 —
 * this guarantees a user is never left unassigned just because their
 * profile fields don't happen to line up with any mentor's stated
 * best-fit goals.
 */
export function pickBestMentor(mentors: Mentor[], input: MatchInput): MatchResult {
  if (mentors.length === 0) {
    throw new Error("pickBestMentor called with an empty mentor list");
  }

  const sortedForTieBreak = [...mentors].sort((a, b) => a.slug.localeCompare(b.slug));
  const scored = sortedForTieBreak.map((mentor) => scoreMentor(mentor, input));

  return scored.reduce((best, current) => (current.score > best.score ? current : best));
}
