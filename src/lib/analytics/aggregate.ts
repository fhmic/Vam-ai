/**
 * Stage 5 — Insights dashboard (individual-account analytics).
 *
 * Pure aggregation math only — no I/O — so every function here is
 * directly unit-testable (tests/unit/analytics-aggregate.test.ts). The
 * server component that calls these (src/app/(app)/insights/page.tsx)
 * is responsible for fetching the raw rows and is intentionally kept
 * thin.
 */

export function completionRate(completed: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((completed / total) * 100);
}

export interface FeedbackSummary {
  averageRating: number | null;
  totalRatings: number;
  positiveRate: number | null;
}

/** ratings: array of -1 | 1, one per message_feedback row. */
export function summarizeFeedback(ratings: number[]): FeedbackSummary {
  if (ratings.length === 0) {
    return { averageRating: null, totalRatings: 0, positiveRate: null };
  }
  const positive = ratings.filter((r) => r > 0).length;
  const sum = ratings.reduce((acc, r) => acc + r, 0);
  return {
    averageRating: Math.round((sum / ratings.length) * 100) / 100,
    totalRatings: ratings.length,
    positiveRate: Math.round((positive / ratings.length) * 100),
  };
}

export interface AssessmentDimensionTrend {
  dimension: string;
  values: number[];
  delta: number | null;
}

/**
 * Groups assessment_scores.scores (one jsonb blob per submission, taken
 * over time) by dimension key, in chronological order, and computes the
 * change from the first to the most recent value — the simplest
 * possible "are you improving" signal without inventing a scoring
 * model beyond what Groq already returned per submission.
 */
export function buildAssessmentTrends(
  scoresOverTime: Record<string, number>[],
): AssessmentDimensionTrend[] {
  const byDimension = new Map<string, number[]>();

  for (const scores of scoresOverTime) {
    for (const [dimension, value] of Object.entries(scores)) {
      const existing = byDimension.get(dimension) ?? [];
      existing.push(value);
      byDimension.set(dimension, existing);
    }
  }

  return Array.from(byDimension.entries()).map(([dimension, values]) => ({
    dimension,
    values,
    delta: values.length >= 2 ? values[values.length - 1]! - values[0]! : null,
  }));
}
