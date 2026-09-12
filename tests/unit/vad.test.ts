import { describe, expect, it } from "vitest";
import { computeRms, nextVadState, DEFAULT_VAD_CONFIG } from "@/lib/voice/vad";

describe("computeRms", () => {
  it("returns 0 for silence (all-zero samples)", () => {
    expect(computeRms(new Float32Array([0, 0, 0, 0]))).toBe(0);
  });

  it("returns 0 for an empty buffer rather than dividing by zero", () => {
    expect(computeRms(new Float32Array([]))).toBe(0);
  });

  it("returns 1 for a full-scale constant signal", () => {
    expect(computeRms(new Float32Array([1, 1, 1, 1]))).toBeCloseTo(1);
  });
});

describe("nextVadState", () => {
  const idle = { isSpeaking: false, silenceDurationMs: 0 };

  it("transitions to speaking the instant a loud frame arrives", () => {
    const { state, utteranceEnded } = nextVadState(idle, 0.5, 16, DEFAULT_VAD_CONFIG);
    expect(state.isSpeaking).toBe(true);
    expect(utteranceEnded).toBe(false);
  });

  it("stays idle on a quiet frame when not already speaking", () => {
    const { state, utteranceEnded } = nextVadState(idle, 0.001, 16, DEFAULT_VAD_CONFIG);
    expect(state.isSpeaking).toBe(false);
    expect(utteranceEnded).toBe(false);
  });

  it("does not end the utterance on a brief pause shorter than the silence timeout", () => {
    const speaking = { isSpeaking: true, silenceDurationMs: 0 };
    const { state, utteranceEnded } = nextVadState(speaking, 0.001, 200, DEFAULT_VAD_CONFIG);
    expect(utteranceEnded).toBe(false);
    expect(state.isSpeaking).toBe(true);
  });

  it("ends the utterance once accumulated silence crosses the timeout", () => {
    let state = { isSpeaking: true, silenceDurationMs: 0 };
    let utteranceEnded = false;
    // Feed quiet frames until we cross the 700ms default timeout.
    for (let i = 0; i < 10 && !utteranceEnded; i++) {
      const result = nextVadState(state, 0.001, 100, DEFAULT_VAD_CONFIG);
      state = result.state;
      utteranceEnded = result.utteranceEnded;
    }
    expect(utteranceEnded).toBe(true);
    expect(state.isSpeaking).toBe(false);
  });

  it("resets the silence counter if speech resumes before the timeout", () => {
    const midSilence = { isSpeaking: true, silenceDurationMs: 400 };
    const { state } = nextVadState(midSilence, 0.5, 16, DEFAULT_VAD_CONFIG);
    expect(state.silenceDurationMs).toBe(0);
    expect(state.isSpeaking).toBe(true);
  });
});
