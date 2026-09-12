/**
 * Product Redefinition — Stage 7, Predictive Coaching (scoped as a
 * "next best action" engine, per explicit decision).
 *
 * Pure priority waterfall — no I/O — so it's directly unit-testable
 * (tests/unit/next-action.test.ts). The server component that calls
 * this (dashboard/page.tsx) is responsible for fetching the raw
 * inputs; this function only decides what to recommend given them.
 *
 * This is "predictive" in the sense that matters here: rather than
 * always pointing at the next sequential program day (which is just
 * fixed sequencing, already handled by /api/journeys/advance), it
 * reacts to a declining or weak assessment trend and reprioritizes
 * what "next" means — surfacing a focus area the user's own data
 * suggests they need, ahead of the default curriculum sequence.
 */

export interface IncompleteActionItem {
  id: string;
  title: string;
  createdAt: string;
}

export interface AssessmentDimensionTrend {
  dimension: string;
  values: number[];
  delta: number | null;
}

export interface CurrentProgramDay {
  dayNumber: number;
  week: number;
  title: string;
  objective: string;
}

export type NextAction =
  | { type: "action_item"; title: string; description: string; actionItemId: string }
  | { type: "assessment_focus"; title: string; description: string; dimension: string }
  | { type: "program_day"; title: string; description: string; dayNumber: number }
  | { type: "none"; title: string; description: string };

/**
 * Maps a weak assessment dimension to a concrete practice suggestion.
 * Keyed to the seeded "communication-style-baseline" template
 * (migration 0020) — a dimension with no mapping here falls through to
 * a generic phrasing rather than breaking, since custom future
 * assessment templates will introduce dimension ids this map doesn't
 * know about yet.
 */
const DIMENSION_FOCUS_SUGGESTIONS: Record<string, string> = {
  confidence_pressure:
    "Practice speaking up in a simulated high-pressure exchange — try a role-play scenario with your mentor where you're challenged mid-point.",
  clarity_feedback:
    "Practice giving one piece of direct feedback using Situation-Behavior-Impact, without softening the language.",
  structure_presenting:
    "Practice structuring a point as Situation, Analysis, Recommendation before presenting it out loud.",
};

const ASSESSMENT_TREND_DECLINE_THRESHOLD = -5;
const ASSESSMENT_LOW_SCORE_THRESHOLD = 50;

/**
 * Priority order:
 *   1. An incomplete action item (the user already committed to this).
 *   2. A declining or persistently low assessment dimension (the
 *      user's own data says this needs attention now, ahead of
 *      whatever the fixed program sequence would say next).
 *   3. The next 30-day program day (the default, always-available
 *      fallback — fixed sequencing, not a prediction).
 *   4. Nothing to recommend (new user, no signal yet at all).
 */
export function pickNextAction(input: {
  incompleteActionItems: IncompleteActionItem[];
  assessmentTrends: AssessmentDimensionTrend[];
  currentProgramDay: CurrentProgramDay | null;
}): NextAction {
  if (input.incompleteActionItems.length > 0) {
    const oldest = [...input.incompleteActionItems].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    )[0]!;
    return {
      type: "action_item",
      title: "Finish a committed action item",
      description: oldest.title,
      actionItemId: oldest.id,
    };
  }

  const weakestTrend = findWeakestTrend(input.assessmentTrends);
  if (weakestTrend) {
    const suggestion =
      DIMENSION_FOCUS_SUGGESTIONS[weakestTrend.dimension] ??
      `Focus your next session on "${weakestTrend.dimension.replace(/_/g, " ")}" — your recent scores suggest this needs attention.`;
    return {
      type: "assessment_focus",
      title: "Strengthen a weak area",
      description: suggestion,
      dimension: weakestTrend.dimension,
    };
  }

  if (input.currentProgramDay) {
    return {
      type: "program_day",
      title: `Continue Day ${input.currentProgramDay.dayNumber} of your program`,
      description: input.currentProgramDay.objective,
      dayNumber: input.currentProgramDay.dayNumber,
    };
  }

  return {
    type: "none",
    title: "Start your first conversation",
    description: "Talk to your mentor to get your first recommendation.",
  };
}

/**
 * Finds the dimension most in need of attention: a declining trend
 * takes priority over a merely-low-but-stable one, since a decline is
 * a more urgent signal than a static weakness. Deterministic tie-break
 * by dimension name so repeated calls with identical input never
 * disagree.
 */
export function findWeakestTrend(
  trends: AssessmentDimensionTrend[],
): AssessmentDimensionTrend | null {
  const declining = trends
    .filter((t) => t.delta !== null && t.delta < ASSESSMENT_TREND_DECLINE_THRESHOLD)
    .sort((a, b) => (a.delta! - b.delta!) || a.dimension.localeCompare(b.dimension));
  if (declining.length > 0) return declining[0]!;

  const low = trends
    .filter((t) => t.values.length > 0 && t.values[t.values.length - 1]! < ASSESSMENT_LOW_SCORE_THRESHOLD)
    .sort(
      (a, b) =>
        a.values[a.values.length - 1]! - b.values[b.values.length - 1]! ||
        a.dimension.localeCompare(b.dimension),
    );
  if (low.length > 0) return low[0]!;

  return null;
}
