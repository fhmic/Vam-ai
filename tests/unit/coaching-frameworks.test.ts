import { describe, expect, it } from "vitest";
import { pickRelevantFramework } from "@/lib/coaching/frameworks";
import type { CoachingFramework } from "@/types/database";

function framework(overrides: Partial<CoachingFramework>): CoachingFramework {
  return {
    id: "id",
    slug: "slug",
    name: "Name",
    description: "Description",
    framework_prompt: "Prompt",
    applicable_goals: [],
    is_active: true,
    created_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

const star = framework({ slug: "star-interview", applicable_goals: ["Ace Interviews"] });
const grow = framework({ slug: "grow-model", applicable_goals: ["Leadership Communication"] });

describe("pickRelevantFramework", () => {
  it("returns null when primary_goal is not set", () => {
    expect(pickRelevantFramework([star, grow], null)).toBeNull();
  });

  it("returns the framework whose applicable_goals matches the primary goal", () => {
    const result = pickRelevantFramework([star, grow], "Ace Interviews");
    expect(result?.slug).toBe("star-interview");
  });

  it("returns null when no framework matches", () => {
    const result = pickRelevantFramework([star, grow], "Improve Confidence");
    expect(result).toBeNull();
  });

  it("is deterministic when multiple frameworks could match", () => {
    const dup = framework({ slug: "zzz-also-interviews", applicable_goals: ["Ace Interviews"] });
    const first = pickRelevantFramework([dup, star], "Ace Interviews");
    const second = pickRelevantFramework([star, dup], "Ace Interviews");
    expect(first?.slug).toBe(second?.slug);
  });
});
