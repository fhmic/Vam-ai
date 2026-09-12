"use client";

import { useCallback, useRef } from "react";
import { computeRms, nextVadState, DEFAULT_VAD_CONFIG, type VadState, type VadConfig } from "@/lib/voice/vad";

/**
 * Stage 6 — samples mic audio energy every animation frame via an
 * AnalyserNode and runs it through the pure VAD decision logic
 * (src/lib/voice/vad.ts). Exposes imperative callbacks rather than
 * React state, since this needs to react within a single frame
 * (~16ms) for barge-in to feel instant — routing every frame through
 * a state update/re-render would add latency for no benefit, since
 * nothing here needs to be rendered.
 */
export function useVoiceActivityDetection(config: VadConfig = DEFAULT_VAD_CONFIG) {
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const vadStateRef = useRef<VadState>({ isSpeaking: false, silenceDurationMs: 0 });
  const lastFrameTimeRef = useRef<number>(0);

  const start = useCallback(
    (
      stream: MediaStream,
      callbacks: {
        onSpeechStart?: () => void;
        onUtteranceEnd?: () => void;
      },
    ) => {
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      vadStateRef.current = { isSpeaking: false, silenceDurationMs: 0 };
      lastFrameTimeRef.current = performance.now();

      const buffer = new Float32Array(analyser.fftSize);
      let wasSpeaking = false;

      const tick = () => {
        analyser.getFloatTimeDomainData(buffer);
        const rms = computeRms(buffer);
        const now = performance.now();
        const deltaMs = now - lastFrameTimeRef.current;
        lastFrameTimeRef.current = now;

        const { state, utteranceEnded } = nextVadState(vadStateRef.current, rms, deltaMs, config);
        vadStateRef.current = state;

        if (state.isSpeaking && !wasSpeaking) {
          callbacks.onSpeechStart?.();
        }
        wasSpeaking = state.isSpeaking;

        if (utteranceEnded) {
          callbacks.onUtteranceEnd?.();
        }

        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    },
    [config],
  );

  const stop = useCallback(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    analyserRef.current?.disconnect();
    void audioContextRef.current?.close();
    audioContextRef.current = null;
    analyserRef.current = null;
  }, []);

  return { start, stop };
}
