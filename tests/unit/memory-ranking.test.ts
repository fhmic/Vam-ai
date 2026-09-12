import { describe, expect, it } from "vitest";
import { rankMemories } from "@/lib/memory/retrieval";

const NOW = new Date("2026-07-18T00:00:00.000Z");

function item(id: string, importance: number, daysAgo: number) {
  const created = new Date(NOW.getTime() - daysAgo * 24 * 60 * 60 * 1000);
  return { id, importance, created_at: created.toISOString() };
}

describe("rankMemories", () => {
  it("ranks a high-importance recent item above a low-importance recent item", () => {
    const items = [item("low", 0.2, 1), item("high", 0.9, 1)];
    const ranked = rankMemories(items, NOW);
    expect(ranked[0]?.id).toBe("high");
  });

  it("decays an old item below a newer item of the same importance", () => {
    const items = [item("old", 0.8, 90), item("new", 0.8, 1)];
    const ranked = rankMemories(items, NOW);
    expect(ranked[0]?.id).toBe("new");
  });

  it("can let a very important old item outrank a low-importance new item", () => {
    const items = [item("important-old", 0.95, 20), item("trivial-new", 0.1, 0)];
    const ranked = rankMemories(items, NOW);
    expect(ranked[0]?.id).toBe("important-old");
  });

  it("returns an empty array unchanged", () => {
    expect(rankMemories([], NOW)).toEqual([]);
  });
});
