"use client";

/**
 * Stage 6 — plays queued sentence audio sequentially through a single
 * <audio> element, fetching TTS for each sentence as it's queued
 * (rather than waiting for the whole reply). `stop()` is the barge-in
 * primitive: called the instant VAD detects the user speaking again,
 * it clears the queue and halts playback immediately rather than
 * letting the current sentence finish.
 */
export class TtsPlaybackQueue {
  private queue: string[] = [];
  private isPlaying = false;
  private stopped = false;
  private audio: HTMLAudioElement;
  private currentObjectUrl: string | null = null;
  private inFlightController: AbortController | null = null;

  constructor(audioElement: HTMLAudioElement) {
    this.audio = audioElement;
  }

  enqueue(sentence: string) {
    if (this.stopped) return;
    this.queue.push(sentence);
    if (!this.isPlaying) void this.playNext();
  }

  stop() {
    this.stopped = true;
    this.queue = [];
    this.inFlightController?.abort();
    this.audio.pause();
    this.audio.currentTime = 0;
    if (this.currentObjectUrl) {
      URL.revokeObjectURL(this.currentObjectUrl);
      this.currentObjectUrl = null;
    }
    this.isPlaying = false;
  }

  /** Call before reusing the queue for a new reply. */
  reset() {
    this.stopped = false;
  }

  private async playNext() {
    const sentence = this.queue.shift();
    if (!sentence || this.stopped) {
      this.isPlaying = false;
      return;
    }
    this.isPlaying = true;

    try {
      this.inFlightController = new AbortController();
      const res = await fetch("/api/voice/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: sentence }),
        signal: this.inFlightController.signal,
      });
      if (!res.ok || this.stopped) {
        this.isPlaying = false;
        if (!this.stopped) void this.playNext();
        return;
      }

      const blob = await res.blob();
      if (this.stopped) return;

      if (this.currentObjectUrl) URL.revokeObjectURL(this.currentObjectUrl);
      this.currentObjectUrl = URL.createObjectURL(blob);
      this.audio.src = this.currentObjectUrl;

      await new Promise<void>((resolve) => {
        this.audio.onended = () => resolve();
        this.audio.onerror = () => resolve();
        void this.audio.play().catch(() => resolve());
      });
    } catch {
      // Aborted or network error — fall through to try the next sentence.
    }

    if (!this.stopped) void this.playNext();
    else this.isPlaying = false;
  }
}
