import { describe, expect, it } from "vitest";
import { findWeakestTrend, pickNextAction } from "@/lib/recommendations/next-action";

describe("findWeakestTrend", () => {
  it("returns null when there are no trends at all", () => {
    expect(findWeakestTrend([])).toBeNull();
  });

  it("prioritizes a declining trend over a merely-low-but-stable one", () => {
    const trends = [
      { dimension: "low_but_stable", values: [40, 41, 40], delta: 0 },
      { dimension: "declining", values: [80, 60], delta: -20 },
    ];
    expect(findWeakestTrend(trends)?.dimension).toBe("declining");
  });

  it("picks the most steeply declining dimension when several are declining", () => {
    const trends = [
      { dimension: "mild_decline", values: [80, 72], delta: -8 },
      { dimension: "steep_decline", values: [80, 50], delta: -30 },
    ];
    expect(findWeakestTrend(trends)?.dimension).toBe("steep_decline");
  });

  it("falls back to the lowest current score when nothing is declining", () => {
    const trends = [
      { dimension: "ok", values: [70], delta: null },
      { dimension: "weak", values: [30], delta: null },
    ];
    expect(findWeakestTrend(trends)?.dimension).toBe("weak");
  });

  it("returns null when nothing is declining and nothing is below the low-score threshold", () => {
    const trends = [
      { dimension: "fine", values: [80], delta: 2 },
      { dimension: "also_fine", values: [75], delta: 1 },
    ];
    expect(findWeakestTrend(trends)).toBeNull();
  });

  it("is deterministic when two dimensions tie exactly", () => {
    const trends = [
      { dimension: "b_dimension", values: [80, 60], delta: -20 },
      { dimension: "a_dimension", values: [80, 60], delta: -20 },
    ];
    expect(findWeakestTrend(trends)?.dimension).toBe("a_dimension");
  });
});

describe("pickNextAction", () => {
  const programDay = { dayNumber: 5, week: 1, title: "Day 5: Structure Under Pressure", objective: "Practice." };

  it("prioritizes an incomplete action item above everything else", () => {
    const action = pickNextAction({
      incompleteActionItems: [{ id: "item-1", title: "Draft the budget one-pager", createdAt: "2026-01-01" }],
      assessmentTrends: [{ dimension: "confidence_pressure", values: [40, 20], delta: -20 }],
      currentProgramDay: programDay,
    });
    expect(action.type).toBe("action_item");
    if (action.type === "action_item") {
      expect(action.actionItemId).toBe("item-1");
    }
  });

  it("picks the oldest incomplete action item when there are several", () => {
    const action = pickNextAction({
      incompleteActionItems: [
        { id: "newer", title: "Newer task", createdAt: "2026-02-01" },
        { id: "older", title: "Older task", createdAt: "2026-01-01" },
      ],
      assessmentTrends: [],
      currentProgramDay: null,
    });
    expect(action.type).toBe("action_item");
    if (action.type === "action_item") {
      expect(action.actionItemId).toBe("older");
    }
  });

  it("falls back to an assessment focus when there are no action items", () => {
    const action = pickNextAction({
      incompleteActionItems: [],
      assessmentTrends: [{ dimension: "confidence_pressure", values: [60, 30], delta: -30 }],
      currentProgramDay: programDay,
    });
    expect(action.type).toBe("assessment_focus");
    if (action.type === "assessment_focus") {
      expect(action.dimension).toBe("confidence_pressure");
      expect(action.description).toContain("high-pressure");
    }
  });

  it("uses a generic phrasing for an unmapped assessment dimension", () => {
    const action = pickNextAction({
      incompleteActionItems: [],
      assessmentTrends: [{ dimension: "some_future_dimension", values: [60, 30], delta: -30 }],
      currentProgramDay: null,
    });
    expect(action.type).toBe("assessment_focus");
    if (action.type === "assessment_focus") {
      expect(action.description).toContain("some future dimension");
    }
  });

  it("falls back to the current program day when there is no action item or weak trend", () => {
    const action = pickNextAction({
      incompleteActionItems: [],
      assessmentTrends: [],
      currentProgramDay: programDay,
    });
    expect(action.type).toBe("program_day");
    if (action.type === "program_day") {
      expect(action.dayNumber).toBe(5);
    }
  });

  it("falls back to 'none' for a brand-new user with no signal at all", () => {
    const action = pickNextAction({
      incompleteActionItems: [],
      assessmentTrends: [],
      currentProgramDay: null,
    });
    expect(action.type).toBe("none");
  });
});
