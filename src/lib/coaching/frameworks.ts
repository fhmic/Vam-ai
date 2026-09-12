import type { CoachingFramework, Profile } from "@/types/database";

/**
 * Stage 4.2 — Executive coaching frameworks.
 *
 * Pure and unit-testable (tests/unit/coaching-frameworks.test.ts).
 * Returns the first active framework whose applicable_goals includes
 * the user's primary_goal, or null if none matches — buildSystemPrompt
 * (src/lib/groq/prompts.ts) only injects a framework fragment when one
 * is found, so "no matching framework" is a normal, expected outcome,
 * not an error.
 */
export function pickRelevantFramework(
  frameworks: CoachingFramework[],
  primaryGoal: Profile["primary_goal"],
): CoachingFramework | null {
  if (!primaryGoal) return null;

  const sorted = [...frameworks].sort((a, b) => a.slug.localeCompare(b.slug));
  return sorted.find((f) => f.applicable_goals.includes(primaryGoal)) ?? null;
}
