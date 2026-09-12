import { describe, expect, it } from "vitest";
import { mondayOfCurrentWeek } from "@/lib/action-plans/suggest";

describe("mondayOfCurrentWeek", () => {
  it("returns the same date when given a Monday", () => {
    // 2026-07-20 is a Monday.
    const monday = new Date("2026-07-20T12:00:00.000Z");
    expect(mondayOfCurrentWeek(monday)).toBe("2026-07-20");
  });

  it("returns the preceding Monday when given a mid-week date", () => {
    // 2026-07-23 is a Thursday in the same week as 2026-07-20.
    const thursday = new Date("2026-07-23T09:00:00.000Z");
    expect(mondayOfCurrentWeek(thursday)).toBe("2026-07-20");
  });

  it("handles Sunday correctly (rolls back to the prior Monday, not forward)", () => {
    // 2026-07-26 is a Sunday, still part of the week starting 2026-07-20.
    const sunday = new Date("2026-07-26T23:00:00.000Z");
    expect(mondayOfCurrentWeek(sunday)).toBe("2026-07-20");
  });

  it("rolls over correctly across a month boundary", () => {
    // 2026-08-01 is a Saturday; the Monday of that week is 2026-07-27.
    const saturday = new Date("2026-08-01T00:00:00.000Z");
    expect(mondayOfCurrentWeek(saturday)).toBe("2026-07-27");
  });
});
