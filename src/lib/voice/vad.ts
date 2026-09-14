/**
 * Pure energy-threshold VAD decision logic.
 *
 * As of the Gemini Live migration, this is no longer wired to any
 * live hook — the hooks that used it (use-voice-activity-detection.ts,
 * use-live-conversation.ts) were deleted because Gemini Live's own
 * server-side VAD (see deploy/live-relay/server.mjs) replaced this
 * client-side energy-threshold approach for the hands-free "Go live"
 * mode. Kept here — not deleted — for two reasons: (1) `MIC_CONSTRAINTS`
 * below is still used by every mic-capture call site, including the
 * new Gemini Live hook, and (2) this pure decision function and its
 * unit tests remain a useful, correct, general-purpose piece of logic
 * if a future non-Live voice path ever needs client-side turn
 * detection again (e.g. an offline/degraded-connectivity fallback).
 *
 * Deliberately simple (RMS-over-threshold with a hangover window) —
 * not a trained VAD model. Good enough to detect "is someone talking
 * right now" in a quiet-ish environment; will false-trigger on loud
 * background noise.
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
 * use-voice-recorder.ts, live/duplex mode in use-gemini-live.ts)
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
