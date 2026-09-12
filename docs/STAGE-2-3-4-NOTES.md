# VA — Stage 2/3/4 Implementation Notes

Companion to `docs/blueprint/VA-Phase1-Technical-Blueprint.md` and the
Phase 1A audit docs. Records the scope decisions and known gaps across
Stage 2 (Mentor Domain Model, Mentor Matching Engine, Groq Integration,
Conversation Memory, Voice Layer, Progress Tracking), Stage 3 (Goal
management, Weekly action plans, Better memory, Progress analytics,
Mentor quality), and Stage 4 (Assessments, Coaching frameworks,
Personalised coaching journeys) — so none of this is mistaken for
oversights later.

## Scope note: Mentor Matching Engine wasn't in the original blueprint

The Phase 1 blueprint specified a single, fixed mentor persona for
Phase 1. Stage 2 was asked for explicitly as a matching engine across
multiple personas, so four mentor personas (`the-coach`, `the-guide`,
`the-strategist`, `the-sparring-partner`) were seeded in migration 0011
and a deterministic scoring engine (`src/lib/mentor/matching.ts`) picks
between them based on the profile/preference fields already collected
during onboarding. This is a genuine scope expansion, done deliberately,
not a misreading of the original architecture doc.

## Not live-tested: Groq API

`api.groq.com` is not reachable from the environment this was built in.
Every Groq-calling function (`src/lib/groq/client.ts`: chat completion
streaming, JSON-mode completion, transcription, speech synthesis) is
implemented against Groq's documented REST API shape (OpenAI-compatible
`/openai/v1/chat/completions`, `/audio/transcriptions`, `/audio/speech`)
but has never actually been called. Before relying on this:

1. Verify `GROQ_MODEL_CHAT`, `GROQ_MODEL_UTILITY`, `GROQ_MODEL_STT`,
   `GROQ_MODEL_TTS` in `.env.local`/Vercel are real, currently-available
   Groq-hosted model names — Groq's model catalog changes over time and
   this repo does not hardcode any model name, specifically so it can't
   silently go stale in code.
2. Verify Groq's `/audio/speech` endpoint and request shape match what
   `synthesizeSpeech()` sends — this was implemented from a general
   understanding of Groq's TTS offering, not a verified live spec.
3. Run one real end-to-end chat turn against a real Groq key before
   trusting the SSE-parsing logic in `mentor-chat.tsx` and
   `readGroqSseText()` in `/api/chat/route.ts` — both assume the
   standard OpenAI-style `data: {"choices":[{"delta":{"content":"..."}}]}`
   SSE chunk shape.
4. Stage 3/4 add three more Groq-calling functions with the same
   caveat: `generateWeeklyActionPlan` (action plan suggestions),
   `consolidateMemoriesIfNeeded` (memory consolidation), and
   `submitAssessment` (assessment scoring) — none have been called
   against a live Groq key either.

## Deliberate gap: no embedding-based memory retrieval

`memory_items.embedding` (migration 0014) exists in the schema but is
never populated or queried. Groq does not offer an embeddings endpoint;
no other embedding provider has been selected. Retrieval
(`src/lib/memory/retrieval.ts`) ranks purely by `importance x
recency-decay`. This is fine for a small number of memory items per
user but will degrade as memory grows — revisit once an embedding
provider is chosen (this only requires changing `getRelevantMemories`,
not the schema).

## Deliberate gap: memory extraction and progress snapshots are synchronous, not queued

The Phase 1 blueprint (Section 6.4) describes memory extraction as a
queued Postgres/pg_cron job. Stage 2 instead runs extraction inline,
after the streamed reply is buffered, inside the same request's async
tail (`persistFullReply` in `/api/chat/route.ts`) — extraction runs
every 6 messages, non-blocking to the client response. Progress
snapshot recording (`recordActivitySnapshot`) runs on every turn. Both
are fire-and-forget from the client's perspective but still consume
server compute per request. Acceptable at current scale; revisit with
real queue infrastructure if Groq utility-call volume or database write
volume becomes a cost/latency concern.

## Deliberate gap: assessments are not part of Stage 2

Progress Tracking (Stage 2.6) is activity-derived only (`total_messages`,
`day_streak`). `progress_snapshots.source` already distinguishes
`'activity'` from `'assessment'` so assessment-derived snapshots can be
added later without a schema change — but no assessment engine exists
in this codebase yet.

## Voice: placeholder voice identifiers

`mentors.voice_id` values (e.g. `voice-warm-male-01`) and the fallback
map in `src/lib/voice/provider.ts` are placeholders, not real
identifiers from any specific TTS provider's voice catalog. Replace
these with real voice IDs once the actual TTS provider/catalog is
confirmed against Groq's live API (or a different provider, if Groq's
TTS offering turns out not to fit — the `VoiceProvider`-style
abstraction in `resolveVoiceId()` is the only place that would need to
change).

## Voice gender switching — how it actually works

`user_preferences.voice_gender` (`'auto' | 'male' | 'female'`, migration
0016) is user-editable directly via the RLS-scoped browser client (no
custom API route — the existing owner-update policy on
`user_preferences` already permits it). `/api/voice/tts` re-reads this
preference on every request and resolves the actual voice via
`resolveVoiceId()`, so a change takes effect on the very next spoken
reply with no client-side state to keep in sync. `'auto'` defers to
whichever mentor is currently assigned; `'male'`/`'female'` always
override it, regardless of mentor.

## Security pattern followed for all new privileged code

Every new privileged operation (`/api/chat`, `/api/voice/stt`,
`/api/voice/tts`, `/api/mentor/rematch`) starts with
`verifyAuthenticatedUser()` before touching the admin client, per
ADR-002 and the Phase 1A audit's established pattern — including the
soft-delete rejection added in that audit, which now also protects
every Stage 2 route for free.

## What was actually validated in this environment

`npm run lint`, `npx tsc --noEmit`, `npx vitest run` (47 passing, 6
still-skipped DB integration tests unrelated to Stage 2/3/4), and
`npm run build` were all executed against the real repository with
Stage 2, 3, and 4 code included, and all passed. What was **not**
validated: any live Groq API call, any live Supabase migration apply
(same sandbox limitation as the Phase 1A audit — no Docker daemon
available here), and no browser-level test of `MediaRecorder`/audio
playback (jsdom, used by this project's test environment, does not
implement either).

## Stage 3 / Stage 4 scope notes

**Mentor-authored writes vs. user-authored writes.** Stage 3 introduced
a distinction that didn't exist before: `action_plan_items` and
`goals` are simple enough, low-sensitivity user content that the client
writes directly via RLS (same justification as the original `goals`
table). `memory_items`, `assessment_responses`/`scores`, and
`user_journey_progress` are server-computed or server-validated and
therefore admin-client-only, following the same pattern established in
Phase 1A/Stage 2 — no new security pattern was invented, existing ones
were extended consistently.

**Mentor quality feedback and message ids.** `/api/chat` streams a raw
Groq SSE proxy and persists the mentor's message asynchronously
server-side — the client never gets the message id back directly. The
feedback UI (`mentor-chat.tsx`) works around this with a best-effort
poll (two attempts, 400ms then 1200ms) against the `messages` table
after the stream ends. This is inherently racy: on a slow persist, the
thumbs up/down buttons simply won't appear for that message, with no
retry beyond the two attempts. If mentor quality feedback becomes a
priority metric, the cleaner fix is having `/api/chat` emit the
message id as a custom SSE event (e.g. `event: message_id`) once
`persistFullReply` finishes, rather than polling for it.

**Memory consolidation threshold (`CONSOLIDATION_THRESHOLD = 30`) is
an unvalidated guess.** No real usage data exists yet to tune this
against — 30 raw memory items before consolidating into summaries is a
reasonable starting point, not a measured one. Revisit once real
conversation volume exists.

**Coaching journeys currently seed only 2 of many possible paths**
(`ace-interviews-4-week`, `executive-presence-6-week`), matching only 2
of the 7 `primary_goal` options collected at onboarding. Users with
other primary goals will see the journeys list but nothing tailored to
their specific goal — this is a content gap (more journeys need
writing), not a code gap.

**Progress analytics chart is a hand-rolled SVG, not a charting
library.** Deliberate — avoids adding a dependency (Chart.js/Recharts)
for a single sparkline. Revisit if Stage 5's "Enterprise dashboards"
needs genuinely richer visualizations (multi-series comparisons,
zooming, etc.) — at that point a real charting library is probably the
right call rather than extending the hand-rolled component.
