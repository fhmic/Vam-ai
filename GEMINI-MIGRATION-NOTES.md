# VA: Gemini migration + Live voice — final apply notes

**This patch supersedes `vam-ai-gemini-migration.patch` from earlier —
apply only this one, not both.** Built against commit `6b60da1`.

## Apply

```
cd vam-ai
git apply --check vam-ai-gemini-and-live-voice.patch   # dry run
git apply vam-ai-gemini-and-live-voice.patch
npm install --legacy-peer-deps   # unrelated eslint-config-next peer
                                  # conflict in this repo, not caused
                                  # by this patch
```

Verified in a clean clone at `6b60da1`: `tsc --noEmit` clean,
`vitest run` 130/130 (one pre-existing, unrelated sandbox-tooling test
failure in `avatar-shuffle.test.ts` — confirmed via `git diff` that
this patch never touches avatar files; 6 integration tests skip
without live Supabase creds, also unrelated), `next build` clean with
all new routes present.

## 1. Database — one new migration

```
supabase db push --linked --dry-run   # confirm only 0029 is new
supabase db push --linked
```

`0029_mentor_voice_ids_gemini.sql` fixes the four mentors' `voice_id`
— they were placeholder strings that would 502 on the first real TTS
or Live call.

## 2. Main app env vars (Vercel + `.env.local`)

Delete: `GROQ_API_KEY`, `GROQ_MODEL_CHAT`, `GROQ_MODEL_UTILITY`,
`GROQ_MODEL_STT`, `GROQ_MODEL_TTS`.

Add (full reasoning for each default is in `.env.example`):

```
GEMINI_API_KEY=
GEMINI_MODEL_CHAT=gemini-3.5-flash
GEMINI_MODEL_UTILITY=gemini-3.1-flash-lite
GEMINI_MODEL_STT=gemini-3.1-flash-lite
GEMINI_MODEL_TTS=gemini-3.1-flash-tts-preview

LIVE_RELAY_SECRET=            # generate: openssl rand -hex 32
NEXT_PUBLIC_LIVE_RELAY_URL=   # wss://<your-relay>.fly.dev — set after step 3
GEMINI_MODEL_LIVE=gemini-3.1-flash-live-preview
```

Get a Gemini key at https://aistudio.google.com/apikey.

## 3. Deploy the Live relay (new, separate deployable)

Full steps and the Fly-vs-Railway reasoning are in
`deploy/live-relay/README.md`. Short version:

```
cd deploy/live-relay
fly launch --no-deploy
fly secrets set GEMINI_API_KEY=<same key as step 2, or a separate one>
fly secrets set LIVE_RELAY_SECRET=<the exact same value from step 2>
fly deploy
```

Then go back and set `NEXT_PUBLIC_LIVE_RELAY_URL` on the main app to
the relay's `wss://` URL and redeploy the main app.

## 4. What's new in this patch beyond the last one

Everything from the earlier Gemini-migration patch, plus:

- **Full-duplex Live voice**, replacing the old client-VAD
  approximation entirely (`use-live-conversation.ts` /
  `use-voice-activity-detection.ts` deleted): a small always-on relay
  (`deploy/live-relay/`) holds the actual Gemini Live WebSocket open
  — something Vercel serverless can't do — while the browser
  (`src/hooks/use-gemini-live.ts` + an AudioWorklet) streams mic audio
  in and plays mentor audio back gaplessly. Barge-in is now driven by
  Gemini's own server-side VAD (a real `interrupted` signal), not a
  client-side energy-threshold guess.
- **Live-turn persistence** (`/api/voice/live-turn`) — a live
  conversation's turns now save to the `messages` table the same way
  text/push-to-talk turns do (same memory-extraction pipeline,
  reused via a small refactor of `persist-reply.ts`). Reloading
  mid-conversation only loses the current in-progress turn now, not
  the whole session.
- **Persona doc reconciliation** (`docs/VAM.md` §4) — the doc
  previously described a different mentor set (maya/jules/sam/priya,
  anxiety/parenting-focused) than what's actually seeded in code
  (Morgan/Ava/Priya/Jordan, executive-coaching-focused, per migration
  `0025`). Reconciled the doc to match the real, live mentor set
  rather than the DB — the DB reflects an intentional, already-applied
  product pivot; the doc was just stale.
- **A real bug fix found along the way**: `/api/voice/tts` was still
  labeling its response `Content-Type: audio/mpeg` even though the
  earlier patch changed `synthesizeSpeech()` to return WAV bytes —
  fixed. Worth knowing this shipped in the previous patch unnoticed;
  a reminder that "typechecks and builds" doesn't catch every
  correctness bug, only structural ones.

## 5. Explicitly flagged, not fixed here — your call

- **`/api/chat` trusts a client-supplied `sessionId` without verifying
  it belongs to the caller** — a pre-existing gap (predates this
  patch). An authenticated user who guessed or obtained another
  user's session UUID could read that session's history into their
  own chat context and write into it. I did **not** fix this in
  `/api/chat` itself (out of scope for a provider swap + Live-voice
  addition, and I didn't want to touch unrelated code paths this late
  in the work), but I did add the ownership check to the new
  `/api/voice/live-turn` route so it doesn't repeat the same mistake.
  Worth fixing in `/api/chat` before a real launch — a session ID is
  effectively a bearer token right now.
- **`docs/VAM.md` §5** (the 30-day program) still names two journeys
  (`anxiety-foundations`, `confidence-foundations`) that don't exist
  in the actual migrations either — flagged inline in the doc, not
  reconciled, since it's a different section than what "persona
  discrepancies" asked for.
- **Voice-name-to-gender mapping** (`Puck`=male, `Kore`=female, etc.)
  is a best guess from Gemini's short voice descriptions, not a
  verified listen-through.

## 6. Not live-tested — the one caveat that matters most before launch

No part of this was run against a real Gemini key, a real Fly
deployment, or a real browser microphone — this sandbox has network
access to none of those. Before calling this launch-ready:

1. One real text chat turn (confirms the OpenAI-compat SSE format
   assumption in `mentor-chat.tsx` and `persist-reply.ts`).
2. One real push-to-talk turn (confirms `transcribeAudio`/
   `synthesizeSpeech`'s request/response shapes).
3. One real "Go live" conversation, on a real deployed relay, on a
   real device with a real microphone — this is the biggest unknown
   in the whole patch. Specifically watch for: whether Gemini Live's
   `setup` message actually accepts `speechConfig`/
   `inputAudioTranscription`/`outputAudioTranscription` at the nesting
   this code guesses (flagged inline in `server.mjs`), and whether the
   `AudioContext({ sampleRate: 16000 })` request is honored by real
   devices rather than silently clamped to a different rate.

Everything above this line typechecks, builds, and passes its unit
tests — none of that substitutes for a real end-to-end run before
calling it launched.
