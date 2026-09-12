import { describe, expect, it } from "vitest";
import { buildAssessmentTrends, completionRate, summarizeFeedback } from "@/lib/analytics/aggregate";

describe("completionRate", () => {
  it("returns 0 for an empty set rather than dividing by zero", () => {
    expect(completionRate(0, 0)).toBe(0);
  });

  it("rounds to the nearest whole percent", () => {
    expect(completionRate(1, 3)).toBe(33);
  });

  it("returns 100 when everything is complete", () => {
    expect(completionRate(5, 5)).toBe(100);
  });
});

describe("summarizeFeedback", () => {
  it("returns nulls when there is no feedback yet", () => {
    const result = summarizeFeedback([]);
    expect(result.averageRating).toBeNull();
    expect(result.positiveRate).toBeNull();
    expect(result.totalRatings).toBe(0);
  });

  it("computes positive rate correctly for a mixed set", () => {
    const result = summarizeFeedback([1, 1, -1, 1]);
    expect(result.totalRatings).toBe(4);
    expect(result.positiveRate).toBe(75);
  });

  it("computes average rating correctly", () => {
    const result = summarizeFeedback([1, -1]);
    expect(result.averageRating).toBe(0);
  });
});

describe("buildAssessmentTrends", () => {
  it("groups scores by dimension across multiple submissions in order", () => {
    const trends = buildAssessmentTrends([
      { confidence_pressure: 40, clarity_feedback: 60 },
      { confidence_pressure: 55, clarity_feedback: 65 },
    ]);

    const confidence = trends.find((t) => t.dimension === "confidence_pressure");
    expect(confidence?.values).toEqual([40, 55]);
    expect(confidence?.delta).toBe(15);
  });

  it("returns a null delta when only one submission exists", () => {
    const trends = buildAssessmentTrends([{ confidence_pressure: 40 }]);
    expect(trends[0]?.delta).toBeNull();
  });

  it("returns an empty array when there is no assessment history", () => {
    expect(buildAssessmentTrends([])).toEqual([]);
  });

  it("handles a dimension that disappears in a later submission without crashing", () => {
    const trends = buildAssessmentTrends([
      { confidence_pressure: 40, clarity_feedback: 60 },
      { confidence_pressure: 55 },
    ]);
    const clarity = trends.find((t) => t.dimension === "clarity_feedback");
    expect(clarity?.values).toEqual([60]);
    expect(clarity?.delta).toBeNull();
  });
});
