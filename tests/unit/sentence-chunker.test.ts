import { describe, expect, it } from "vitest";
import { extractCompletedSentences, flushRemainingBuffer, initialChunkerState } from "@/lib/voice/sentence-chunker";

describe("extractCompletedSentences", () => {
  it("returns no sentences until a boundary is reached", () => {
    const { newSentences, nextState } = extractCompletedSentences("Let's talk about your goal", initialChunkerState);
    expect(newSentences).toEqual([]);
    expect(nextState.pendingBuffer).toBe("Let's talk about your goal");
  });

  it("extracts a completed sentence once punctuation and whitespace follow", () => {
    const { newSentences, nextState } = extractCompletedSentences(
      "Let's talk about your goal. What's on your mind",
      initialChunkerState,
    );
    expect(newSentences).toEqual(["Let's talk about your goal."]);
    expect(nextState.pendingBuffer).toBe("What's on your mind");
  });

  it("only processes text that hasn't already been seen, across multiple calls", () => {
    const first = extractCompletedSentences("First sentence here. ", initialChunkerState);
    expect(first.newSentences).toEqual(["First sentence here."]);

    const second = extractCompletedSentences("First sentence here. Second one now.", first.nextState);
    expect(second.newSentences).toEqual(["Second one now."]);
    // Must not re-emit the first sentence.
    expect(second.nextState.sentSentences).toEqual(["First sentence here.", "Second one now."]);
  });

  it("does not split on a short abbreviation-like fragment (e.g. 'Dr.')", () => {
    const { newSentences } = extractCompletedSentences("Dr. Smith recommended", initialChunkerState);
    expect(newSentences).toEqual([]);
  });

  it("handles multiple complete sentences arriving in one chunk", () => {
    const { newSentences } = extractCompletedSentences(
      "First point stands. Second point matters too. Third point closes it out.",
      initialChunkerState,
    );
    expect(newSentences).toEqual([
      "First point stands.",
      "Second point matters too.",
      "Third point closes it out.",
    ]);
  });

  it("handles exclamation and question marks as sentence boundaries", () => {
    const { newSentences } = extractCompletedSentences("That went great! Ready for the next one?", initialChunkerState);
    expect(newSentences).toEqual(["That went great!", "Ready for the next one?"]);
  });
});

describe("flushRemainingBuffer", () => {
  it("returns null when the buffer is empty", () => {
    expect(flushRemainingBuffer(initialChunkerState)).toBeNull();
  });

  it("returns the trimmed trailing partial sentence", () => {
    const { nextState } = extractCompletedSentences("A finished one. And an unfinished tail", initialChunkerState);
    expect(flushRemainingBuffer(nextState)).toBe("And an unfinished tail");
  });
});
