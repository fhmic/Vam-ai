import { describe, expect, it } from "vitest";
import { COMPANION_AVATARS, getMentorAvatar, MENTOR_AVATARS, pickCompanionAvatar } from "@/lib/avatar/registry";

describe("pickCompanionAvatar", () => {
  it("is deterministic for the same module key", () => {
    const first = pickCompanionAvatar("progress");
    const second = pickCompanionAvatar("progress");
    expect(first).toBe(second);
  });

  it("always returns one of the defined companion avatars", () => {
    for (const key of ["progress", "assessments", "journeys", "insights", "dashboard"]) {
      expect(COMPANION_AVATARS).toContain(pickCompanionAvatar(key));
    }
  });

  it("varies across at least some different module keys", () => {
    const results = new Set(
      ["progress", "assessments", "journeys", "insights", "dashboard"].map((k) => pickCompanionAvatar(k)),
    );
    // Not asserting every key gets a unique avatar (4 companions, 5 keys
    // makes that impossible) — just that it isn't the same one every time.
    expect(results.size).toBeGreaterThan(1);
  });
});

describe("getMentorAvatar", () => {
  it("returns the mapped avatar for a known mentor slug", () => {
    expect(getMentorAvatar("the-coach")).toBe(MENTOR_AVATARS["the-coach"]);
  });

  it("falls back to a default avatar for an unknown or null slug", () => {
    expect(getMentorAvatar(null)).toBeDefined();
    expect(getMentorAvatar("not-a-real-mentor")).toBeDefined();
  });
});
