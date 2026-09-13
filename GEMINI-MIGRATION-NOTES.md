# Gemini migration — apply notes

Patch: `vam-ai-gemini-migration.patch`, built against commit `6b60da1`.

## Apply

```
cd vam-ai
git apply --check vam-ai-gemini-migration.patch   # dry run
git apply vam-ai-gemini-migration.patch
npm install --legacy-peer-deps                     # unrelated eslint-config-next
                                                     # peer conflict in this repo,
                                                     # not caused by this patch
```

Verified in a clean clone at `6b60da1` before packaging: `tsc --noEmit` clean,
`vitest run` 135/135 (6 pre-existing integration tests skip without live
Supabase creds — unrelated to this patch), `next build` clean.

## Env vars — replace in Vercel + `.env.local`

Delete: `GROQ_API_KEY`, `GROQ_MODEL_CHAT`, `GROQ_MODEL_UTILITY`,
`GROQ_MODEL_STT`, `GROQ_MODEL_TTS`.

Add (see updated `.env.example` for the why behind each default):

```
GEMINI_API_KEY=
GEMINI_MODEL_CHAT=gemini-3.5-flash
GEMINI_MODEL_UTILITY=gemini-3.1-flash-lite
GEMINI_MODEL_STT=gemini-3.1-flash-lite
GEMINI_MODEL_TTS=gemini-3.1-flash-tts-preview
```

Get a key at https://aistudio.google.com/apikey.

## Database — one new migration

`supabase/migrations/0029_mentor_voice_ids_gemini.sql` fixes the four
seeded mentors' `voice_id` — they were literal placeholder strings
(`voice-warm-male-01`) that were never real for *any* provider and
would 502 on the first real TTS call. Run:

```
supabase db push --linked --dry-run   # confirm only 0029 is new
supabase db push --linked
```

## What changed (beyond the provider swap)

Real bugs found and fixed while doing the swap, not just renames:

1. **Missing safety guardrail.** `docs/VAM.md` documented a crisis/
   self-harm guardrail as already present in every mentor prompt —
   it wasn't. Added to `src/lib/ai/prompts.ts`.
2. **Placeholder voice ids** (above) — would have 502'd on first
   real use regardless of provider.
3. **No echo cancellation requested** on either mic-capture call
   site — both called `getUserMedia({ audio: true })` with zero
   constraints. Now requests `echoCancellation`/`noiseSuppression`/
   `autoGainControl`. Reduces (doesn't eliminate) false barge-in
   from the mentor's own TTS bleeding into the mic.
4. **Privacy policy** still listed "Groq" as a sub-processor —
   corrected to Google/Gemini.
5. **Stale comment**: memory retrieval's "no embeddings" gap was
   attributed to "Groq has no embeddings endpoint" — Gemini does
   have one. Comment corrected; retrieval itself is unchanged
   (wiring up embeddings is real, separate scope — see §23.3).

## Explicitly NOT done — needs your call, not a silent guess

- **`docs/VAM.md` §4 (Mentor)**: the doc describes four mentors
  (maya/jules/sam/priya, anxiety/parenting-focused) that don't match
  what's actually seeded in code (Morgan/Ava/Priya/Jordan, executive-
  coaching-focused, migration `0011` + `0025`). Flagged inline in the
  doc rather than silently rewritten — this is a product-content
  question, not an engineering one.
- **Gemini Live / true full-duplex voice**: not started. Needs a
  hosting decision (Fly.io/Railway/etc.) for a small persistent-
  connection relay, since Vercel serverless can't hold a Live API
  websocket open. Separate piece of work from this patch.
- **Voice-name-to-gender mapping** (`Puck`=male, `Kore`=female,
  etc. in `voice/provider.ts` and migration `0029`) is a best guess
  from Google's short voice descriptions, not a verified listen-
  through. Worth 10 minutes in Google AI Studio's speech playground
  before shipping.

## Still not live-tested

Same caveat this repo already carried under Groq: no network path to
`generativelanguage.googleapis.com` from the sandbox this was built
in. `src/lib/ai/client.ts`'s docstring lists exactly what to verify
against a real key before trusting it — do that (one real chat turn,
one real STT call, one real TTS call) before this goes live.
