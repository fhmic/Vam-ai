"use client";

import { useCallback, useRef, useState } from "react";

export type VoiceRecorderState = "idle" | "recording" | "processing";

/**
 * Stage 2.5 — Voice Layer, push-to-talk (Phase 1 blueprint Section 9.1:
 * "push-to-talk", not full duplex). Caller holds the mic button down
 * (or taps to start/stop), gets a single audio Blob back on stop.
 */
export function useVoiceRecorder() {
  const [state, setState] = useState<VoiceRecorderState>("idle");
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const start = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setState("recording");
    } catch {
      setError("Microphone access was denied or is unavailable. You can still type instead.");
      setState("idle");
    }
  }, []);

  const stop = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const recorder = mediaRecorderRef.current;
      if (!recorder) {
        resolve(null);
        return;
      }

      setState("processing");
      recorder.onstop = () => {
        recorder.stream.getTracks().forEach((track) => track.stop());
        const blob = chunksRef.current.length > 0 ? new Blob(chunksRef.current, { type: "audio/webm" }) : null;
        mediaRecorderRef.current = null;
        setState("idle");
        resolve(blob);
      };
      recorder.stop();
    });
  }, []);

  return { state, error, start, stop };
}
