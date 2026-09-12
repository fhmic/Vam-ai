import { describe, expect, it } from "vitest";
import { pickBestMentor, scoreMentor, type MatchInput } from "@/lib/mentor/matching";
import type { Mentor } from "@/types/database";

function mentor(overrides: Partial<Mentor>): Mentor {
  return {
    id: "id",
    slug: "slug",
    display_name: "Name",
    tagline: "Tagline",
    persona_prompt: "Prompt",
    mentor_style: "balanced",
    best_fit_goals: [],
    voice_id: "voice-warm-female-01",
    is_active: true,
    created_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

const challenging = mentor({
  slug: "the-coach",
  mentor_style: "challenging",
  best_fit_goals: ["Ace Interviews"],
});
const supportive = mentor({
  slug: "the-guide",
  mentor_style: "supportive",
  best_fit_goals: ["Improve Confidence"],
});
const balanced = mentor({
  slug: "the-strategist",
  mentor_style: "balanced",
  best_fit_goals: ["Leadership Communication"],
});

describe("scoreMentor", () => {
  it("scores a goal match higher than a style-only match", () => {
    const input: MatchInput = {
      careerLevel: "Senior Level",
      primaryGoal: "Ace Interviews",
      mentorStyle: "balanced",
      coachingIntensity: "medium",
    };

    const goalMatch = scoreMentor(challenging, input);
    const noMatch = scoreMentor(balanced, input);

    expect(goalMatch.score).toBeGreaterThan(noMatch.score);
    expect(goalMatch.reason).toContain("primary_goal:Ace Interviews");
  });

  it("rewards coaching_intensity alignment with mentor style", () => {
    const input: MatchInput = {
      careerLevel: "Senior Level",
      primaryGoal: null,
      mentorStyle: "balanced",
      coachingIntensity: "high",
    };

    const result = scoreMentor(challenging, input);
    expect(result.reason).toContain("coaching_intensity:high");
  });

  it("falls back to 'default_fallback' when nothing matches", () => {
    const input: MatchInput = {
      careerLevel: null,
      primaryGoal: null,
      mentorStyle: "balanced",
      coachingIntensity: "medium",
    };

    const result = scoreMentor(challenging, input);
    expect(result.score).toBe(0);
    expect(result.reason).toBe("default_fallback");
  });
});

describe("pickBestMentor", () => {
  it("picks the mentor whose best_fit_goals includes the user's primary goal", () => {
    const input: MatchInput = {
      careerLevel: "Senior Level",
      primaryGoal: "Improve Confidence",
      mentorStyle: "supportive",
      coachingIntensity: "low",
    };

    const result = pickBestMentor([challenging, supportive, balanced], input);
    expect(result.mentor.slug).toBe("the-guide");
  });

  it("never leaves a user unmatched even when no mentor scores above zero", () => {
    const input: MatchInput = {
      careerLevel: null,
      primaryGoal: null,
      mentorStyle: "balanced",
      coachingIntensity: "medium",
    };

    // No mentor here has mentor_style 'balanced', so every score is 0 —
    // the function must still deterministically return one mentor.
    const result = pickBestMentor([challenging, supportive], input);
    expect(result.mentor).toBeDefined();
  });

  it("is deterministic across repeated calls with identical input", () => {
    const input: MatchInput = {
      careerLevel: null,
      primaryGoal: null,
      mentorStyle: "balanced",
      coachingIntensity: "medium",
    };

    const first = pickBestMentor([challenging, supportive, balanced], input);
    const second = pickBestMentor([challenging, supportive, balanced], input);
    expect(first.mentor.slug).toBe(second.mentor.slug);
  });

  it("throws on an empty mentor list rather than silently returning undefined", () => {
    const input: MatchInput = {
      careerLevel: null,
      primaryGoal: null,
      mentorStyle: "balanced",
      coachingIntensity: "medium",
    };
    expect(() => pickBestMentor([], input)).toThrow();
  });
});
