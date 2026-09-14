"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { MessageBubble } from "@/components/chat/message-bubble";
import { MessageFeedback } from "@/components/chat/message-feedback";
import { VoiceGenderToggle } from "@/components/voice/voice-gender-toggle";
import { useVoiceRecorder } from "@/hooks/use-voice-recorder";
import { useGeminiLive } from "@/hooks/use-gemini-live";
import { createClient } from "@/lib/supabase/client";
import { getMentorAvatar } from "@/lib/avatar/registry";
import { WaveformBars } from "@/components/waveform/waveform-bars";
import { TtsPlaybackQueue } from "@/lib/voice/tts-playback-queue";
import { extractCompletedSentences, flushRemainingBuffer, initialChunkerState } from "@/lib/voice/sentence-chunker";
import type { UserPreferences } from "@/types/database";

interface ChatMessage {
  role: "user" | "mentor";
  content: string;
  id?: string;
}

/**
 * Stage 6/Gemini migration — Real-time duplex voice.
 *
 * Two voice modes coexist, and they are architecturally different
 * from each other, not just styled differently:
 *  - Push-to-talk (Stage 2): record on click -> /api/voice/stt ->
 *    /api/chat (text) -> /api/voice/tts, sentence-by-sentence.
 *  - Live conversation (Gemini Live relay, see
 *    deploy/live-relay/server.mjs and src/hooks/use-gemini-live.ts):
 *    a single continuous full-duplex audio session — no separate
 *    STT/chat/TTS calls, Gemini's own server-side VAD and turn
 *    detection handle listening and interruption, and this component
 *    only receives already-transcribed text (for the on-screen
 *    history) and already-played-back audio (handled inside the
 *    hook). This replaced an earlier client-VAD-over-REST
 *    approximation of live conversation this file used to implement
 *    directly — see the Gemini migration patch notes for why that
 *    approach was replaced rather than kept as a fallback.
 */
export function MentorChat(props: {
  mentorSlug: string | null;
  mentorName: string;
  mentorTagline: string | null;
  initialSessionId: string | null;
  initialHistory: ChatMessage[];
  initialVoiceGender: UserPreferences["voice_gender"];
  voiceEnabled: boolean;
}) {
  const Avatar = getMentorAvatar(props.mentorSlug);
  const supabase = createClient();
  const router = useRouter();
  const [sessionId, setSessionId] = useState(props.initialSessionId);
  const [isRematching, setIsRematching] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(props.initialHistory);
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [liveModeOn, setLiveModeOn] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ttsQueueRef = useRef<TtsPlaybackQueue | null>(null);
  const chunkerStateRef = useRef(initialChunkerState);
  const abortControllerRef = useRef<AbortController | null>(null);
  const recorder = useVoiceRecorder();
  // Tracks whether the in-progress live-mode transcript bubbles (one
  // user, one mentor) have already been started for the current turn,
  // so successive transcript fragments append to the same bubble
  // instead of each starting a new one, and accumulates the raw text
  // so the full turn can be persisted via /api/voice/live-turn once
  // it completes (the relay itself has no database access — see that
  // route's docstring). Reset on turnComplete.
  const liveTurnRef = useRef<{
    userStarted: boolean;
    mentorStarted: boolean;
    userText: string;
    mentorText: string;
  }>({ userStarted: false, mentorStarted: false, userText: "", mentorText: "" });

  useEffect(() => {
    if (audioRef.current && !ttsQueueRef.current) {
      ttsQueueRef.current = new TtsPlaybackQueue(audioRef.current);
    }
  }, []);

  /**
   * NOT LIVE-VERIFIED whether Gemini's input/output transcription
   * arrives as incremental delta fragments (append) or repeated
   * full-so-far text (replace) — treated as delta/append here to
   * match how every other streaming text path in this app already
   * works (/api/chat's SSE deltas). If a real session shows Gemini
   * sending full-replace transcripts instead, these two callbacks are
   * the only place that needs to change.
   */
  const geminiLive = useGeminiLive({
    onUserTranscript: (text) => {
      liveTurnRef.current.userText += text;
      setMessages((prev) => {
        if (!liveTurnRef.current.userStarted) {
          liveTurnRef.current.userStarted = true;
          return [...prev, { role: "user", content: text }];
        }
        const next = [...prev];
        const last = next[next.length - 1];
        next[next.length - 1] = { role: "user", content: (last?.content ?? "") + text };
        return next;
      });
    },
    onMentorTranscript: (text) => {
      liveTurnRef.current.mentorText += text;
      setMessages((prev) => {
        if (!liveTurnRef.current.mentorStarted) {
          liveTurnRef.current.mentorStarted = true;
          return [...prev, { role: "mentor", content: text }];
        }
        const next = [...prev];
        const last = next[next.length - 1];
        next[next.length - 1] = { role: "mentor", content: (last?.content ?? "") + text };
        return next;
      });
    },
    onTurnComplete: () => {
      const { userText, mentorText } = liveTurnRef.current;
      liveTurnRef.current = { userStarted: false, mentorStarted: false, userText: "", mentorText: "" };

      // Both sides need at least something to persist a turn — an
      // empty fragment can happen if the relay sends a turnComplete
      // with no preceding transcript content (e.g. a very short
      // interruption). Fire-and-forget: this is a best-effort save,
      // matching persistMentorReply's own "log, don't surface to the
      // user" failure handling for the equivalent text-mode path.
      if (userText.trim() && mentorText.trim()) {
        fetch("/api/voice/live-turn", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, userText, mentorText }),
        })
          .then((res) => (res.ok ? res.json() : null))
          .then((data: { sessionId?: string } | null) => {
            if (data?.sessionId && data.sessionId !== sessionId) setSessionId(data.sessionId);
          })
          .catch((err) => {
            // eslint-disable-next-line no-console
            console.error("live-turn persistence failed:", err);
          });
      }
    },
  });

  async function transcribeAndSend(blob: Blob) {
    const form = new FormData();
    form.append("audio", blob, "voice-note.webm");
    const res = await fetch("/api/voice/stt", { method: "POST", body: form });
    if (!res.ok) {
      setVoiceError("Could not transcribe that.");
      return;
    }
    const { transcript } = await res.json();
    if (transcript) {
      void send(transcript, "voice");
    }
  }

  async function streamMentorTurn(url: string, body: Record<string, unknown>) {
    ttsQueueRef.current?.reset();
    chunkerStateRef.current = initialChunkerState;
    let mentorReply = "";
    setMessages((prev) => [...prev, { role: "mentor", content: "" }]);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      const newSessionId = res.headers.get("X-Session-Id");
      if (newSessionId) setSessionId(newSessionId);

      if (!res.ok || !res.body) {
        const errBody = await res.json().catch(() => null);
        throw new Error(errBody?.error?.message ?? "The mentor is temporarily unavailable.");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          const payload = trimmed.slice("data:".length).trim();
          if (payload === "[DONE]") continue;
          try {
            const json = JSON.parse(payload);
            const delta: string | undefined = json?.choices?.[0]?.delta?.content;
            if (delta) {
              mentorReply += delta;
              setMessages((prev) => {
                const next = [...prev];
                next[next.length - 1] = { role: "mentor", content: mentorReply };
                return next;
              });

              if (props.voiceEnabled) {
                const { newSentences, nextState } = extractCompletedSentences(
                  mentorReply,
                  chunkerStateRef.current,
                );
                chunkerStateRef.current = nextState;
                for (const sentence of newSentences) {
                  ttsQueueRef.current?.enqueue(sentence);
                }
              }
            }
          } catch {
            // Ignore malformed SSE chunks.
          }
        }
      }

      if (props.voiceEnabled) {
        const trailing = flushRemainingBuffer(chunkerStateRef.current);
        if (trailing) ttsQueueRef.current?.enqueue(trailing);
      }

      void attachMentorMessageId(sessionId ?? newSessionId);
    } catch (err) {
      const isAbort = err instanceof DOMException && err.name === "AbortError";
      if (!isAbort) {
        const message = err instanceof Error ? err.message : "Something went wrong.";
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = { role: "mentor", content: `(${message})` };
          return next;
        });
      }
      // An abort means the user interrupted on purpose (barge-in) —
      // leave whatever partial reply was already shown, no error banner.
    } finally {
      setIsSending(false);
    }
  }

  async function send(text: string, inputMode: "text" | "voice") {
    if (!text.trim() || isSending) return;
    setIsSending(true);
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setDraft("");
    await streamMentorTurn("/api/chat", { sessionId, message: text, inputMode });
  }

  /**
   * Product Redefinition — Mentor Redefinition, proactive opening.
   * Called once on mount when this is a brand-new (zero-message)
   * session — the mentor speaks first, per the brief's requirement
   * that VA never wait passively to be asked "what can I help with".
   * No user message bubble is added; /api/chat/greet doesn't persist
   * one either (see that route's docstring).
   */
  async function triggerGreeting() {
    if (isSending) return;
    setIsSending(true);
    await streamMentorTurn("/api/chat/greet", { sessionId });
  }

  useEffect(() => {
    if (props.initialHistory.length === 0) {
      void triggerGreeting();
    }
    // Intentionally mount-only — this greets once when the session
    // starts empty, not every time some unrelated prop changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function attachMentorMessageId(activeSessionId: string | null) {
    if (!activeSessionId) return;
    // persistFullReply (server-side) writes the mentor message
    // asynchronously after this response stream ends, so there's an
    // inherent small race — retry once after a short delay rather than
    // failing silently on the first miss.
    for (const delayMs of [400, 1200]) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      const { data } = await supabase
        .from("messages")
        .select("id")
        .eq("session_id", activeSessionId)
        .eq("role", "mentor")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data?.id) {
        setMessages((prev) => {
          const next = [...prev];
          const lastIndex = next.length - 1;
          if (next[lastIndex] && next[lastIndex].role === "mentor" && !next[lastIndex].id) {
            next[lastIndex] = { ...next[lastIndex], id: data.id };
          }
          return next;
        });
        return;
      }
    }
  }

  async function handleMicClick() {
    setVoiceError(null);
    if (recorder.state === "idle") {
      await recorder.start();
      if (recorder.error) setVoiceError(recorder.error);
      return;
    }
    if (recorder.state === "recording") {
      const blob = await recorder.stop();
      if (!blob) return;
      void transcribeAndSend(blob);
    }
  }

  /**
   * Re-runs the matching engine. The server returns whether the
   * mentor actually changed; if it did, we refresh the route so the
   * new avatar/name/tagline flow in from the server-side props
   * (a router.refresh() is enough — the parent page is a server
   * component that re-fetches the assignment row).
   */
  async function handleRematch() {
    if (isRematching) return;
    setIsRematching(true);
    try {
      const res = await fetch("/api/mentor/rematch", { method: "POST" });
      if (!res.ok) return;
      const data = (await res.json()) as { changed: boolean };
      if (data.changed) {
        // Reset the current session so the new mentor greets fresh.
        // A full page refresh re-runs the server component with the
        // new assignment; we keep the in-memory message history
        // because the user's text-input drafts are still useful, but
        // we explicitly DO NOT keep the old conversation's history
        // on screen — it was with the previous mentor.
        setMessages([]);
        setSessionId(null);
        router.refresh();
      }
    } finally {
      setIsRematching(false);
    }
  }

  function toggleLiveMode() {
    if (liveModeOn) {
      geminiLive.stop();
      setLiveModeOn(false);
    } else {
      setVoiceError(null);
      void geminiLive.start();
      setLiveModeOn(true);
    }
  }

  const liveStateLabel: Record<string, string> = {
    idle: "",
    connecting: "Connecting…",
    live: "Listening…",
    "mentor-speaking": "Speaking…",
  };

  return (
    <div className="flex h-[calc(100vh-9rem)] flex-col">
      <div className="mb-4 flex items-center justify-between border-b border-ink/10 dark:border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12 shrink-0" />
          <div>
            <h1 className="font-display text-xl font-medium text-ink dark:text-white">{props.mentorName}</h1>
            {props.mentorTagline ? <p className="text-sm text-ink/60 dark:text-white/60">{props.mentorTagline}</p> : null}
            <div className="mt-1 flex items-center gap-2">
              <WaveformBars active={isSending || geminiLive.state === "mentor-speaking"} className="h-3" />
              {liveModeOn ? (
                <span className="text-xs text-current-500">{liveStateLabel[geminiLive.state]}</span>
              ) : null}
            </div>
          </div>
        </div>
        <VoiceGenderToggle initialValue={props.initialVoiceGender} />
        <Button
          type="button"
          variant="secondary"
          onClick={handleRematch}
          isLoading={isRematching}
          title="Try a different mentor — re-runs the matching engine based on your current profile and preferences"
        >
          Try a different mentor
        </Button>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto py-2">
        {messages.length === 0 ? (
          <p className="text-sm text-ink/40 dark:text-white/40">Your mentor is getting started…</p>
        ) : (
        messages.map((m, i) => (
          <div key={i}>
            <MessageBubble role={m.role} content={m.content} />
            {m.role === "mentor" && m.id ? (
              <div className="pl-1">
                <MessageFeedback messageId={m.id} />
              </div>
            ) : null}
          </div>
        ))
        )}
      </div>

      {voiceError ? <p className="mb-2 text-xs text-red-600">{voiceError}</p> : null}
      {geminiLive.error ? <p className="mb-2 text-xs text-red-600">{geminiLive.error}</p> : null}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send(draft, "text");
        }}
        className="flex items-end gap-2 border-t border-ink/10 dark:border-white/10 pt-4"
      >
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send(draft, "text");
            }
          }}
          rows={1}
          placeholder="Type a message…"
          className="min-h-11 flex-1 resize-none rounded-xl border border-ink/10 dark:border-white/10 px-3 py-2.5 text-sm
            outline-none focus:border-signal-500 focus:ring-2 focus:ring-signal-500/30"
        />
        <Button
          type="button"
          variant={liveModeOn ? "primary" : "secondary"}
          onClick={toggleLiveMode}
          title="Hands-free live conversation — auto-detects when you talk, and you can interrupt the mentor"
        >
          {liveModeOn ? "End live" : "Go live"}
        </Button>
        <Button
          type="button"
          variant={recorder.state === "recording" ? "primary" : "secondary"}
          onClick={handleMicClick}
          disabled={liveModeOn}
        >
          {recorder.state === "recording" ? "Stop" : "🎙"}
        </Button>
        <Button type="submit" isLoading={isSending} disabled={liveModeOn}>
          Send
        </Button>
      </form>

      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio ref={audioRef} className="hidden" />
    </div>
  );
}
