"use client";

import { useCallback, useRef, useState } from "react";
import { useVoiceActivityDetection } from "@/hooks/use-voice-activity-detection";

export type LiveConversationState = "idle" | "listening" | "user-speaking" | "processing";

/**
 * Stage 6 — hands-free conversation mode. Keeps one continuous mic
 * stream open (rather than push-to-talk's record-per-press), uses VAD
 * to detect when the user starts and stops talking, and hands each
 * detected utterance to `onUtterance` as a Blob — the caller (
 * mentor-chat.tsx) sends it to /api/voice/stt exactly like the
 * push-to-talk flow already does, so the two modes share the same
 * downstream pipeline.
 *
 * `onSpeechStart` fires the instant VAD detects the user talking,
 * independent of whether an utterance is still being recorded — this
 * is the barge-in signal: the caller uses it to abort an in-flight
 * mentor reply and stop TTS playback immediately, before the new
 * utterance has even finished being spoken.
 */
export function useLiveConversation(params: {
  onUtterance: (audio: Blob) => void;
  onSpeechStart: () => void;
}) {
  const [state, setState] = useState<LiveConversationState>("idle");
  const [error, setError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const vad = useVoiceActivityDetection();

  const startRecordingSegment = useCallback(() => {
    const stream = streamRef.current;
    if (!stream) return;
    chunksRef.current = [];
    const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.start();
    recorderRef.current = recorder;
  }, []);

  const finishRecordingSegment = useCallback(() => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === "inactive") return;

    recorder.onstop = () => {
      if (chunksRef.current.length > 0) {
        params.onUtterance(new Blob(chunksRef.current, { type: "audio/webm" }));
      }
    };
    recorder.stop();
    recorderRef.current = null;
  }, [params]);

  const start = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setState("listening");

      vad.start(stream, {
        onSpeechStart: () => {
          setState("user-speaking");
          params.onSpeechStart();
          startRecordingSegment();
        },
        onUtteranceEnd: () => {
          setState("processing");
          finishRecordingSegment();
        },
      });
    } catch {
      setError("Microphone access was denied or is unavailable.");
      setState("idle");
    }
  }, [vad, params, startRecordingSegment, finishRecordingSegment]);

  const stop = useCallback(() => {
    vad.stop();
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setState("idle");
  }, [vad]);

  /** Call once the mentor's reply has finished so state returns to 'listening'. */
  const resumeListening = useCallback(() => {
    if (streamRef.current) setState("listening");
  }, []);

  return { state, error, start, stop, resumeListening };
}
