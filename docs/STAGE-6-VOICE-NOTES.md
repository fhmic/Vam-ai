# VAM — Stage 6 Voice Architecture Notes

## What "full real-time duplex" means here, concretely

Groq's STT (`/audio/transcriptions`) and TTS (`/audio/speech`) are **REST
endpoints, not a WebSocket/realtime streaming API.** There is no way to
open one persistent bidirectional audio socket to Groq and stream raw
audio both directions continuously — that class of product (OpenAI's
Realtime API, ElevenLabs Conversational AI, etc.) is a fundamentally
different architecture requiring a different provider and, usually, a
dedicated always-on server rather than Vercel serverless functions.

What's built instead is a genuinely duplex-**feeling** experience layered
on top of the existing request/response pipeline, entirely client-side
for the parts that need to be instant:

1. **Automatic turn-taking (no push-to-talk button)** — `useVoiceActivityDetection`
   samples mic energy every animation frame via the Web Audio API and
   runs it through a simple RMS-threshold-with-hangover rule
   (`src/lib/voice/vad.ts`). When it decides you've started talking, it
   starts a `MediaRecorder` segment; when you go quiet for
   `silenceTimeoutMs` (700ms default), it finalizes the segment and
   sends it to `/api/voice/stt` — same endpoint push-to-talk already used.

2. **Barge-in (interruption)** — the VAD's "speech started" signal fires
   regardless of what the mentor is doing. If the mentor is still
   generating text or already speaking it back, `handleBargeIn()` in
   `mentor-chat.tsx` aborts the in-flight `/api/chat` fetch
   (`AbortController`) and stops TTS playback immediately
   (`TtsPlaybackQueue.stop()`). The abort signal is propagated all the
   way to the upstream Groq fetch (`/api/chat/route.ts` passes
   `request.signal` through to `streamChatCompletion`), so an
   interruption actually cancels the generation server-side too — not
   just something the client stops listening to while Groq keeps
   generating (and billing) in the background.

3. **Sentence-level streaming TTS** — rather than waiting for the whole
   reply to finish generating before synthesizing speech,
   `extractCompletedSentences` (`src/lib/voice/sentence-chunker.ts`)
   watches the growing SSE text and fires a TTS request for each
   completed sentence as soon as it appears. `TtsPlaybackQueue` plays
   these in order through one `<audio>` element. This is the main lever
   for cutting time-to-first-sound — it's the difference between
   "wait 4 seconds then hear the whole answer" and "hear the first
   sentence in under a second while the rest is still being written."

None of this requires a WebSocket server, a different hosting model, or
a different voice provider. It runs entirely within the existing
Vercel serverless + Groq REST architecture.

## Known limitations, stated plainly

- **VAD is energy-threshold, not a trained model.** It will false-trigger
  on loud background noise (a truck outside, a dog barking) and may
  miss very quiet speech. A proper fix is a WASM-based VAD model (e.g.
  a Silero VAD port) — meaningfully more accurate, but a real dependency
  to add. Left as a documented upgrade path, not built here.
- **Sentence-boundary detection is regex-based**, not a real NLP sentence
  splitter. It handles common cases (periods, exclamation points,
  question marks followed by whitespace) and has a minimum-length guard
  to avoid splitting on things like "Dr." — but it isn't perfect, and
  never fully can be with this approach.
- **No echo cancellation between the mentor's TTS output and the mic
  input.** If your speakers are audible to your own microphone (no
  headphones, no browser-level acoustic echo cancellation beyond what
  `getUserMedia`'s default constraints provide), the VAD could pick up
  the mentor's own voice as "user speech" and trigger a false barge-in.
  Recommend testing with headphones first; a more robust fix would
  explicitly mute VAD processing while TTS audio is actively playing,
  accepting a small usability tradeoff (you couldn't interrupt at all in
  that case) — not implemented, since true barge-in was explicitly the
  point of this stage.
- **Segment-based STT, not streaming STT.** Groq's Whisper endpoint takes
  a complete audio file, so transcription only starts after VAD decides
  your utterance is over (after the silence timeout) — there's no
  partial/live transcript while you're still talking.
- **Not live-tested against a real Groq key** — same caveat as every
  other Groq-calling function in this codebase (see
  `docs/STAGE-2-3-4-NOTES.md`). The `/audio/speech` request shape in
  particular has never been exercised against Groq's actual API.

## If you later want genuine low-latency continuous streaming

That requires a different provider built for it (OpenAI Realtime API,
ElevenLabs Conversational AI, Deepgram's streaming STT, etc.) and
usually a persistent connection your serverless functions can't hold
open — a small dedicated WebSocket relay (Fly.io, Railway, a tiny
always-on box) sitting between the browser and that provider. That's a
genuinely separate infrastructure decision, not an incremental change
to what's here — flag it explicitly if you want to go that direction
later rather than assuming this stage's work carries forward directly.
