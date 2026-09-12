import { describe, expect, it } from "vitest";
import { computeDayStreak } from "@/lib/progress/activity";

const TODAY = new Date("2026-07-18T15:00:00.000Z");

function daysAgoIso(daysAgo: number): string {
  const d = new Date(TODAY);
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d.toISOString();
}

describe("computeDayStreak", () => {
  it("counts today alone as a streak of 1", () => {
    expect(computeDayStreak([daysAgoIso(0)], TODAY)).toBe(1);
  });

  it("counts consecutive days correctly", () => {
    const timestamps = [daysAgoIso(0), daysAgoIso(1), daysAgoIso(2)];
    expect(computeDayStreak(timestamps, TODAY)).toBe(3);
  });

  it("stops counting at the first gap", () => {
    const timestamps = [daysAgoIso(0), daysAgoIso(1), daysAgoIso(3), daysAgoIso(4)];
    expect(computeDayStreak(timestamps, TODAY)).toBe(2);
  });

  it("returns 0 when there is no activity today", () => {
    const timestamps = [daysAgoIso(1), daysAgoIso(2)];
    expect(computeDayStreak(timestamps, TODAY)).toBe(0);
  });

  it("counts multiple messages on the same day as a single day", () => {
    const sameDayDifferentHour = new Date(TODAY);
    sameDayDifferentHour.setUTCHours(1, 0, 0, 0);
    const timestamps = [TODAY.toISOString(), sameDayDifferentHour.toISOString()];
    expect(computeDayStreak(timestamps, TODAY)).toBe(1);
  });
});
