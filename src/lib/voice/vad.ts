/**
 * Stage 6 — Real-time duplex voice.
 *
 * Pure energy-threshold VAD decision logic. The actual audio energy
 * sampling happens in useVoiceActivityDetection (Web Audio API
 * AnalyserNode, browser-only) — this function is the decision rule it
 * calls on every animation frame, kept separate specifically so the
 * turn-taking logic is unit-testable without a browser or a real mic.
 *
 * Deliberately simple (RMS-over-threshold with a hangover window) —
 * not a trained VAD model. Good enough to detect "is someone talking
 * right now" for turn-taking in a quiet-ish environment; will false-
 * trigger on loud background noise. A model-based VAD (e.g. via a
 * WASM port of Silero VAD) would be the natural upgrade if this proves
 * too noise-sensitive in practice.
 */

export interface VadState {
  isSpeaking: boolean;
  /** ms of continuous silence observed since speech last stopped */
  silenceDurationMs: number;
}

export interface VadConfig {
  /** RMS amplitude (0-1) above which a frame counts as "speech" */
  energyThreshold: number;
  /** how long silence must persist before we call the utterance over */
  silenceTimeoutMs: number;
}

export const DEFAULT_VAD_CONFIG: VadConfig = {
  energyThreshold: 0.02,
  silenceTimeoutMs: 700,
};

/**
 * Gemini migration anomaly fix: both mic-capture call sites (push-to-talk in
 * use-voice-recorder.ts, live/duplex mode in use-live-conversation.ts)
 * were previously calling `getUserMedia({ audio: true })` with no
 * constraints at all — leaving acoustic echo cancellation, noise
 * suppression, and auto gain entirely up to whatever a given browser
 * happens to default to (which varies, and is not something to rely on
 * for a product whose live-conversation mode plays the mentor's own
 * TTS audio out of the same device the mic is listening on). This is
 * a real, free fix, not a full solution to the "no true full-duplex"
 * limitation documented in docs/STAGE-6-VOICE-NOTES.md — it reduces
 * how often the mentor's own voice triggers a false barge-in, it
 * doesn't make barge-in detection perfect. A model-based VAD (see
 * vad.ts's module docstring) remains the natural next upgrade if this
 * proves insufficient in practice.
 */
export const MIC_CONSTRAINTS: MediaTrackConstraints = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
};

/**
 * Called once per audio frame with the frame's RMS energy and the time
 * elapsed since the last frame. Returns the next state and whether this
 * frame completes an utterance (speech was happening, then silence
 * persisted past the timeout).
 */
export function nextVadState(
  previous: VadState,
  frameRms: number,
  deltaMs: number,
  config: VadConfig = DEFAULT_VAD_CONFIG,
): { state: VadState; utteranceEnded: boolean } {
  const frameIsSpeech = frameRms >= config.energyThreshold;

  if (frameIsSpeech) {
    return { state: { isSpeaking: true, silenceDurationMs: 0 }, utteranceEnded: false };
  }

  if (!previous.isSpeaking) {
    return { state: { isSpeaking: false, silenceDurationMs: 0 }, utteranceEnded: false };
  }

  const silenceDurationMs = previous.silenceDurationMs + deltaMs;
  const utteranceEnded = silenceDurationMs >= config.silenceTimeoutMs;

  return {
    state: { isSpeaking: utteranceEnded ? false : true, silenceDurationMs },
    utteranceEnded,
  };
}

/** RMS (root-mean-square) amplitude of a Float32 audio sample buffer, 0-1. */
export function computeRms(samples: Float32Array): number {
  if (samples.length === 0) return 0;
  let sumSquares = 0;
  for (let i = 0; i < samples.length; i++) {
    sumSquares += samples[i]! * samples[i]!;
  }
  return Math.sqrt(sumSquares / samples.length);
}
