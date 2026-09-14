# VAM

The consolidated source of truth for the VAM product, architecture, and
delivery. This document is the single file a new engineer should read
end-to-end to understand what VAM is, how it works, how to deploy it,
what was decided and why, and what is left to build.

> **Companion files:**
> - [`docs/adr/`](./adr/) — Architecture Decision Records (kept as
>   separate files because decision-record granularity is the right
>   level of detail for them).
> - [`README.md`](../README.md) — quick orientation and local setup
>   pointer.
> - [`docs/SETUP.md`](./SETUP.md) is **also retained as a standalone
>   file** because it is the canonical, point-and-click deployment
>   walkthrough and is sometimes printed or shared in isolation. The
>   same content is reproduced in §16 below for completeness.

---

## Table of contents

**Part 1 — Product**

1. [What VAM is](#1-what-vam-is)
2. [Product boundaries (in scope / deferred)](#2-product-boundaries)
3. [Personas](#3-personas)
4. [Mentor](#4-mentor)
5. [The 30-day program](#5-the-30-day-program)
6. [Goals, action plans, streaks](#6-goals-action-plans-streaks)
7. [Memory](#7-memory)
8. [Voice](#8-voice)
9. [Collective intelligence](#9-collective-intelligence)
10. [What the user-facing product does](#10-what-the-user-facing-product-does)

**Part 2 — Architecture**

11. [System architecture](#11-system-architecture)
12. [The four Supabase clients](#12-the-four-supabase-clients)
13. [The single auth choke point](#13-the-single-auth-choke-point)
14. [Environment variables](#14-environment-variables)
15. [Security model](#15-security-model)
16. [Conventions & file layout](#16-conventions--file-layout)

**Part 3 — Setup & operations**

17. [Production setup guide](#17-production-setup-guide)
18. [Staging readiness](#18-staging-readiness)
19. [Build verification & troubleshooting](#19-build-verification--troubleshooting)

**Part 4 — Delivery history & roadmap**

20. [Current implementation baseline](#20-current-implementation-baseline)
21. [Phase 1A final audit (collapsed)](#21-phase-1a-final-audit-collapsed)
22. [Phase 1A foundation hardening](#22-phase-1a-foundation-hardening)
23. [Stage 2/3/4 implementation notes](#23-stage-234-implementation-notes)
24. [Voice architecture notes](#24-voice-architecture-notes)
25. [Roadmap (Stages 5–7)](#25-roadmap-stages-57)
26. [Phase 1 historical design baseline (collapsed)](#26-phase-1-historical-design-baseline-collapsed)

**Part 5 — Decision records**

27. [Architecture decision records](#27-architecture-decision-records)

---

## Part 1 — Product

### 1. What VAM is

VAM (Vocal + Acuity) is a privacy-conscious professional communication
coaching web app. An individual improves their communication through a
persistent AI coach, deliberate exercises, assessment and progress
feedback, and—only with explicit consent—de-identified cohort learning.

The core loop is:

```text
Sign up → establish professional context → practise with a coach
→ receive specific feedback and a next action → complete a programme day
→ measure progress → return with context intact
```

VAM is a personal AI mentor that lives in your phone, on your schedule,
and that actually remembers you. It runs structured 30-day programs
(currently anxiety + confidence), generates a 12-week personal action
plan from your goals, lets you talk to your mentor in real time by
voice or text, and surfaces progress insights you can share with a
clinician if you choose.

It is **not** a chatbot. It is **not** a therapy app. It is a coaching
product — opinionated, evidence-informed (CBT, ACT, DBT, motivational
interviewing frameworks behind the same prompt infrastructure), and
built so that every piece of generated content is auditable, every
piece of user data is exportable, and the user can hard-delete their
account at any time with a 30-day recovery window.

### 2. Product boundaries

**In scope for the individual product:**

- Email/password and Google authentication, user-owned data, responsive web.
- AI mentor chat, text and push-to-talk voice interaction.
- Durable, user-scoped memory and professional context.
- Goals, action plans, assessments, progress metrics and trends.
- The universal 30-Day Transformation Program.
- Consent-controlled, aggregate-only Collective Intelligence findings.
- Privacy controls, export, deletion, legal acceptance and support operations.

**Explicitly deferred until a later product decision:**

- Billing, a mentor marketplace, team/group mentoring, enterprise tenancy.
- Native apps, calendar/Slack integrations, fine-tuned models.
- Real-time full-duplex voice and user-to-user live discussions.

These are not accidental gaps. They require product, privacy,
operational, and commercial design beyond the present single-user
product.

### 3. Personas

Four user personas drive the matching, tone, and visual treatment of
the product. They are seeded in `supabase/seed.sql` and referenced
everywhere via the `persona` enum.

| Persona | Voice | Visual accent | When the user is here |
| --- | --- | --- | --- |
| `anxious-avoider` | Soft, slow, validating | Calm blue | Avoidant coping, anxiety, low activation |
| `overwhelmed-parent` | Warm, practical, time-aware | Soft green | High context-switch load, time pressure |
| `career-changer` | Direct, growth-oriented | Amber | Transition, identity work, ambition |
| `recovering-perfectionist` | Gentle but firm | Soft rose | Self-criticism, burnout, high standards |

A persona is assigned during onboarding (step 3 of 5) and is
considered **locked in once assigned** — even if the user later
re-runs `/api/mentor/rematch`, only the **mentor** changes, never
the persona. The user can change persona manually from
`/settings/profile` (not built yet, see §25 Stage 5).


### 4. Mentor

Four mentors are seeded by migration `0011_mentors.sql`, with their
persona copy rewritten by migration
`0025_mentor_executive_coach_redefinition.sql` (Product Redefinition —
see that migration's own comment for the full rationale: the mentor
must act as a proactive Executive Communication Coach, never a passive
"what can I help you with today" assistant). This replaces an earlier
version of this section that described a different, anxiety/burnout/
parenting-focused mentor set (`maya`/`jules`/`sam`/`priya`) seeded from
a `supabase/seed.sql` that doesn't exist in this codebase — that was a
stale holdover from before the redefinition, not something still true;
reconciled below to match what's actually live.

| Mentor | Slug | Specialty | Default tone | Model preference |
| --- | --- | --- | --- | --- |
| Morgan | `the-coach` | High-accountability, boardroom-ready delivery | Direct, high-energy | `GEMINI_MODEL_CHAT` |
| Ava | `the-guide` | Foundational clarity, breath, pacing, structure | Calm, structured | `GEMINI_MODEL_CHAT` |
| Priya | `the-strategist` | Structured thinking (Situation-Analysis-Recommendation) | Balanced, analytical | `GEMINI_MODEL_CHAT` |
| Jordan | `the-sparring-partner` | Practice-first: mock interviews, scenario drilling | Challenging | `GEMINI_MODEL_CHAT` |

Each mentor's distinct `mentor_style` (challenging/supportive/
balanced/practice-first) predates and survived the redefinition —
only the underlying identity/behavior standard changed, not the
style axis matching runs against (see the next paragraph).

Matching (`src/lib/mentor/matching.ts`) scores each candidate against
the onboarding profile and persona, applies deterministic
tie-breaks, and writes the result to `profiles.assigned_mentor`. The
`assignment.ts` helper is the single place that writes
`assigned_mentor_at`.

`/api/mentor/rematch` re-runs matching against the **same** persona
constraint. The UI entry point for rematch is the **"Try a different
mentor"** button in `mentor-chat.tsx` (built; clear messages +
sessionId on change; returns `{changed, mentor}` so the UI no-ops
when matching is deterministic and the same mentor is selected).

The mentor prompt (`src/lib/ai/prompts.ts`) always carries:

- the active mentor's `persona_prompt` and the shared coaching
  philosophy (`COACHING_PHILOSOPHY`),
- the last 8 turns of conversation,
- the top 12 retrieved memories (see §7),
- the active goal + next action,
- the user's timezone + program day,
- a hard-coded set of safety guardrails (`SAFETY_GUARDRAILS`: no
  clinical claims, no diagnosis, redirect to human/crisis support if
  the user mentions self-harm). This block was added during the
  Gemini provider migration — it had been documented here as already
  existing before that, but the prompt-assembly code carried no such
  language at all until then; see `tests/unit/ai-prompt-assembly.test.ts`
  for the regression test that now guards it.

**Note, not part of this reconciliation:** §5 below (the 30-day
program) still names two journeys (`anxiety-foundations`,
`confidence-foundations`) that, like the old mentor set, don't appear
anywhere in the actual migrations — `coaching_journeys` is seeded by
migration 0022 under different slugs, and migration
`0026_thirty_day_transformation_program.sql` describes a single
*universal* 30-day program layered on top, not per-journey ones. This
looks like the same kind of pre-redefinition staleness as the mentor
table did, but reconciling it is outside what was asked for here —
flagging it so it doesn't get missed.

### 5. The 30-day program

Each of the two seeded journeys (`anxiety-foundations`,
`confidence-foundations`) ships with a 30-day program: 30 ordered
days, each with a short lesson + an action item. The program is a
journey, not a course — the user moves through it on their own
schedule, can pause and resume, and the day's content is
personalized by their persona and current progress.

**Source of truth:** `supabase/migrations/0027-*.sql` (program
content) + `supabase/seed.sql` (journey records).

**Resolvers:**

- `src/lib/journeys/current-program-day.ts` computes the active
  program day from `last_active_at` and pause history.
- `/api/journeys/advance` is the only write path for
  `journey_progress`.
- `/journeys` and `/progress` render the same data, with the
  former listing all journeys and the latter emphasizing today's
  action.

The 30-day program is **the primary retention loop** for VAM.
`/dashboard` and `/mentor` are the two surfaces the user opens
on a given day; both surface the current day.



### 6. Goals, action plans, streaks

The user picks a primary goal during onboarding (step 4 of 5).
The action plan generator (`src/lib/action-plans/suggest.ts`)
turns that goal into a 12-week plan: 12 weekly themes, each
with 3-5 concrete actions.

**Streaks** (`src/lib/progress/activity.ts`):

- A day counts toward the streak if the user has any of:
  completed a journey day action, sent a chat message to the
  mentor, or completed an assessment.
- One streak per user, anchored on the user's local timezone
  (resolved from `profiles.timezone`, fallback to `UTC`).

**Next-action** (`src/lib/recommendations/next-action.ts`) returns
a single concrete action the user can take right now, with a
short reason. This is what `/dashboard` shows in the primary
card.

### 7. Memory

VAM's memory system is deliberately simple and auditable:

- **Write path** (`src/lib/memory/extraction.ts`): after every
  mentor reply, the chat persistence layer also calls the
  extractor with the user's last message + the mentor's reply.
  The extractor returns 0-3 short, dated, category-tagged
  memory entries, which are inserted into `memory_items`.
- **Read path** (`src/lib/memory/retrieval.ts`): before every
  chat completion, the system lexically scores the user's last
  message against their `memory_items` table, returns the top
  12, and feeds them into the prompt. Ranking is currently
  `importance x recency-decay`; semantic (embedding) similarity
  is not part of the ranking yet — see §23 for the deliberate
  gap and the extension point.
- **Consolidation** (`src/lib/memory/consolidation.ts`): runs
  nightly via the Vercel cron `memory-consolidate` (see §16.5
  and §17), merges near-duplicates, drops stale entries, and
  re-scores. Implemented as a per-user scan with a 25/run cap
  (Vercel Hobby 10s budget); remaining users are picked up the
  next night.

Memory is scoped to the user by RLS. Memories are surfaced back
to the user in `/insights` and in the settings export.

### 8. Voice

Voice is the primary input/output surface for VAM on mobile. The
end-user experience is a single toggle on `/mentor` that switches
the mentor between text and voice. The wiring is split across
three pieces:

- **STT** (`/api/voice/stt`): the browser captures audio via
  MediaRecorder, posts a `Blob` to the route, the route calls
  Gemini (`GEMINI_MODEL_STT`, via a native `generateContent` call
  with the audio as an inline data part — Gemini has no dedicated
  transcription endpoint), and returns the transcript.
- **VAD** (`src/lib/voice/vad.ts`): a small browser utility that
  watches the input level and emits a `speech-end` event so the
  client knows when to flush and post the recording. This is
  intentionally not a full VAD (we use simple RMS thresholding
  today) — a more sophisticated VAD is in the backlog. The Gemini
  provider migration also turned on the browser's own `echoCancellation` /
  `noiseSuppression` / `autoGainControl` constraints on every
  `getUserMedia` call (previously requested with no constraints at
  all) — a real, free reduction in how often the mentor's own TTS
  output falsely triggers barge-in, though not a substitute for a
  proper VAD model.
- **TTS** (`/api/voice/tts` + `src/lib/voice/tts-playback-queue.ts`):
  the mentor reply is chunked by sentence
  (`src/lib/voice/sentence-chunker.ts`), each chunk is sent to
  Gemini (`GEMINI_MODEL_TTS`) in order, and the resulting
  audio — raw PCM wrapped in a WAV header server-side, since
  Gemini's TTS has no container-format output option — is queued
  for sequential playback. The queue smooths out TTS latency so
  the user hears continuous speech instead of one long pause per
  chunk.

Three voice modes coexist on `/mentor`:

1. **Text-only** — no audio in or out.
2. **Push-to-talk** — record on click, send on click.
3. **Live conversation** — continuous mic stream, VAD
   auto-detects utterances, the user can interrupt the mentor
   mid-reply (barge-in). See §24 for the full honest
   architecture writeup — this is **not** literally continuous
   bidirectional audio streaming (Gemini's STT/TTS are REST-shaped
   calls, not a realtime socket API — see §25 for Gemini Live as
   the genuine-duplex upgrade path); it's client-side VAD
   + barge-in + sentence-streamed TTS layered on the existing
   request/response pipeline.

Voice sessions are persisted in `voice_sessions` for auditing
and to enable future analysis. Raw audio is uploaded to the
private `voice-sessions` Storage bucket (migration 0028,
owner-scoped RLS keyed on `auth.uid()` = first path segment).


### 9. Collective intelligence

Consented users benefit from cohort learning without exposing
personal information. The design pattern:

- Explicit opt-in / opt-out; every consent change is recorded in
  `user_consents` (append-only).
- A scheduled aggregate pipeline over approved metrics only —
  never raw messages or free-form assessment answers.
- Cohort suppression: a minimum cohort size (10) is enforced
  before any aggregate is published; the intent is that no
  individual can be re-identified from a published insight.
- An admin back-office at `/admin` (gated by membership in
  `admin_users`, which is manually maintained via the SQL
  console) provides a review-and-publish UI for aggregate
  insights.

**Status as of this writing:** consent ledger, aggregate record
schema, and the manual review/publish UI are built. The automated
scheduled aggregation worker and admin audit logs are not — see
§25 Stage 5.

### 10. What the user-facing product does

Once §17 (production setup) is complete, end users can:

- Sign up / sign in / reset password (email auth via Supabase)
- Complete onboarding (display name, country, profession, primary
  goal, mentor style, coaching intensity) and accept the four
  required legal documents
- Chat with an AI mentor (Morgan / Ava / Priya / Elias) assigned
  by a deterministic matching engine — with one-click
  **Try a different mentor** re-matching
- Use the mentor in text mode or push-to-talk voice mode, or in a
  hands-free "live" mode with barge-in (VAD-driven interruption
  of the mentor mid-reply)
- Take assessments (e.g. Communication Style Baseline) and see
  per-dimension trend charts
- Follow a 30-day curriculum (auto-enrolled at onboarding) with
  one objective per day
- Generate weekly action plans
- Track progress (total messages, day-streak)
- Export or delete their data (GDPR-style, with a 30-day restore
  window)
- View collective intelligence insights (only if they opted in
  via `/legal/re-accept`)
- Admins (any user manually inserted into `admin_users` via SQL
  console) get a back-office insights editor at `/admin`

---


## Part 2 — Architecture

### 11. System architecture

**Layers:**

```text
+-------------------------------------------------------+
|  Next.js 14 App Router (src/app)                      |
|  - Server Components (RSC) by default                 |
|  - Client Components only where interactivity needed  |
|  - Route Handlers under src/app/api/**                |
+-------------------------------------------------------+
                          |
                          v
+-------------------------------------------------------+
|  src/lib (domain logic, pure functions)               |
|  - mentor/  memory/  voice/  ai/  legal/               |
|  - assessments/  action-plans/  recommendations/      |
|  - progress/  analytics/  theme/  avatar/             |
+-------------------------------------------------------+
                          |
                          v
+-------------------------------------------------------+
|  Supabase (Postgres + Auth + Storage + RLS)           |
|  - 29 forward-only migrations                         |
|  - Service role key isolated to server-only paths     |
|  - All user data behind RLS policies                  |
+-------------------------------------------------------+
                          |
                          v
+-------------------------------------------------------+
|  Gemini API (chat, STT, TTS) via raw fetch            |
|  - Chat/JSON via Gemini's OpenAI-compatible endpoint;  |
|    STT/TTS via native generateContent. No SDK; thin   |
|    client in src/lib/ai/client.ts. (Migrated from     |
|    Groq — see §23.2.)                                 |
+-------------------------------------------------------+
```

### 12. The four Supabase clients

| Client | Where | Cookie adapter | Used by |
| --- | --- | --- | --- |
| Browser | `src/lib/supabase/client.ts` | `document.cookie` | All `"use client"` form components |
| Server (RSC + Route Handlers) | `src/lib/supabase/server.ts` | `next/headers` cookies | Server components + Route Handlers with the user's session |
| Admin (service role) | `src/lib/supabase/admin.ts` | none | The internal purge + memory-consolidation crons, the collective-intelligence aggregator |
| Middleware | `src/lib/supabase/middleware.ts` | request cookies | `updateSession` only |

ADR-002 codifies the service-role isolation: the admin client is
only ever instantiated inside route handlers that explicitly
require it, and never in user-facing RSCs. The `admin.ts` module
is marked `import "server-only"` so it cannot accidentally be
imported into a client-bundled code path.

### 13. The single auth choke point

Every protected API route uses `verifyAuthenticatedUser` from
`src/lib/supabase/auth-guard.ts` as its first call. That helper:

1. Calls `supabase.auth.getUser()` (the secure call, not
   `getSession()`).
2. If null, returns `{ user: null, error: 'unauthenticated' }`.
3. If non-null, fetches `profiles.deleted_at` and returns
   `{ user, error: 'soft_deleted' }` if set.

The route handler then either returns 401 or 403, and middleware
short-circuits the redirect to `/account/restore` for soft-deleted
users.

The same pattern is also applied in the `(app)` layout so that
every authenticated page treats a non-null `deleted_at` as
"not signed in" (force-sign-out + redirect), so a soft-deleted
user can never render the app shell or any page under it.

### 14. Environment variables

All env vars are documented in `.env.example`. The complete list:

| Name | Public? | Required? | Used by |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | yes | yes | Supabase clients |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | yes | Supabase clients |
| `SUPABASE_SERVICE_ROLE_KEY` | no | yes (non-dev) | Admin client only |
| `GEMINI_API_KEY` | no | yes | All Gemini calls |
| `GEMINI_MODEL_CHAT` | no | yes | Chat completions |
| `GEMINI_MODEL_UTILITY` | no | yes | Memory extraction, next-action |
| `GEMINI_MODEL_STT` | no | yes | `/api/voice/stt` |
| `GEMINI_MODEL_TTS` | no | yes | `/api/voice/tts` |
| `LIVE_RELAY_SECRET` | no | yes (for Live voice) | `/api/voice/live-session`, `/api/voice/live-turn`'s auth is unaffected — this signs the token the *relay* verifies |
| `NEXT_PUBLIC_LIVE_RELAY_URL` | yes | yes (for Live voice) | Browser's WebSocket target — see `src/hooks/use-gemini-live.ts` |
| `GEMINI_MODEL_LIVE` | no | yes (for Live voice) | `/api/voice/live-session` |
| `INTERNAL_CRON_SECRET` | no | yes (non-dev) | `/api/internal/purge-deleted-accounts` and `/api/internal/memory-consolidate` |
| `SUPABASE_PROJECT_REF` | no | no | `db:types:linked` |
| `RUN_INTEGRATION` | no | no | Test runner flag to enable the live Supabase integration tests |

Anything prefixed `NEXT_PUBLIC_` is exposed to the browser bundle;
**do not put any secret there.** The Gemini API is the primary
third-party AI data processor (see also the Sentry/PostHog entries
in §9 — this line predates those being added and should really list
all three); the Supabase service role key is the only VAM-controlled
secret that is never sent to the browser.


### 15. Security model

**15.1 Authentication**

- Email + password (Supabase Auth) and OAuth (Google) are
  supported. Both go through the same `/auth/callback` route
  handler.
- Password recovery uses Supabase's recovery flow; the
  `recovery` link lands the user on `/update-password` (server
  component, `force-dynamic`).
- Session cookies are HttpOnly, SameSite=Lax, Secure in
  production. The SSR cookie adapter in `@supabase/ssr` handles
  this.

**15.2 Authorization**

- **Row-level security** is enabled on every user-data table
  (see ADR-001). The service role key bypasses RLS and is only
  used in admin paths.
- **One auth choke point** (`verifyAuthenticatedUser`).
- **Mentor assignment is sticky** (locked in once assigned) so a
  user cannot be silently re-matched to a different persona by a
  race in the rematch API.

**15.3 Soft delete**

- `profiles.deleted_at` set => the user cannot reach any
  protected page (middleware redirect) and cannot use any
  protected API (auth guard 403). They can restore from
  `/account/restore` for 30 days.
- The 30-day window is enforced by a Vercel cron (`vercel.json` →
  `/api/internal/purge-deleted-accounts`).
- The cron endpoint is authenticated by `INTERNAL_CRON_SECRET`
  (Bearer header) using `timingSafeEqual`; see
  `src/lib/api/cron-auth.ts`.

**15.4 Data export and deletion**

- `/api/export` returns a JSON document with the user's
  profile, persona, mentor assignment, all journeys, all
  assessments, all action plans, all memory entries, all
  voice sessions, all legal acceptances, and all consent
  records. This is the GDPR / CCPA user-data export.
- Soft delete (above) + the 30-day hard delete satisfy
  right-to-erasure.

**15.5 Legal acceptance**

- 12 documents, versioned in `legal_documents` with a
  `version` column. On every legal-version bump, the user
  must re-accept before they can use protected surfaces
  (the `va_legal_current` cookie + the `verifyLegalAcceptance`
  guard; see ADR-003 for the cookie fast-path design and
  ADR-004 for the audit-table design).
- Acceptance is recorded in `legal_acceptances` with the
  document version + a server timestamp + the user agent +
  the IP (truncated). The table is append-only; a unique
  `(user_id, document_id)` constraint means re-accepting the
  same version is a no-op upsert, never an overwrite.

**15.6 Rate limiting and abuse**

- Today: none. Acceptable for soft launch.
- Pre-public-marketing (Stage 5): a per-user / per-IP limiter
  on `/api/chat`, `/api/voice/*`, `/api/assessments/submit`.

**15.7 Observability**

- Today: `console.error` in the AI provider client and route
  handlers; no centralized log sink.
- `X-Request-Id` is propagated on every `/api/internal/*` route
  (and threaded through from incoming `X-Request-Id` ≤ 200
  chars, or a freshly-minted UUID v4 if absent); see
  `src/lib/api/request-id.ts`.
- Stage 6: Sentry (errors) + Vercel Analytics (request
  latency) + Logflare (server logs).

### 16. Conventions & file layout

**16.1 Code style**

- TypeScript strict, no `any` in committed code.
- ESLint config is the Next.js default plus a small
  `eslint-plugin-import` set. `npm run lint` is clean.
- Tailwind utility classes; no inline styles; no CSS modules.
- The `prefers-color-scheme` and a server-resolved `data-theme`
  attribute drive the dark/light theme; personas layer on top
  via a CSS custom property.

**16.2 File layout**

```text
src/
  app/                 # Next.js App Router
    (app)/             # Authenticated, gated by middleware
    (auth)/            # Public auth pages, all `force-dynamic`
    account/           # Soft-delete + restore flows
    api/               # Route handlers
    legal/             # Static legal documents
    page.tsx           # Marketing landing
  components/          # Shared UI components
  lib/                 # Domain logic (see §11)
  types/
    database.ts        # Generated Supabase types
middleware.ts          # Edge middleware (auth + soft-delete gate)
supabase/
  migrations/          # Forward-only SQL
  seed.sql             # Reference data
  config.toml          # Supabase CLI config
tests/                 # Vitest, mirror the source layout
scripts/               # Build / dev helpers (db-types, etc.)
docs/                  # This file, SETUP.md, and the ADRs
```

**16.3 Naming**

- DB: snake_case, plural table names, singular column names
  (`profiles.full_name`, not `profile.fullName`).
- TS: `camelCase` for variables, `PascalCase` for components
  and types.
- File names: `kebab-case.ts` for non-component files,
  `PascalCase.tsx` for components.

**16.4 Commit and PR conventions**

- One commit per logical change.
- PRs must:
  - pass `npm run typecheck`, `npm run lint`, `npm test`,
    `npm run build` in CI,
  - include a migration in `supabase/migrations/` if they
    touch the schema,
  - include or update a Vitest case if they touch a
    behavior in `src/lib/` or `src/app/api/`,
  - link a stage from §25 if they implement a stage
    deliverable.

---
## Part 3 — Setup & operations

### 17. Production setup guide

> This section is reproduced from [`docs/SETUP.md`](./SETUP.md) (which
> is **also retained as a standalone file** because it is sometimes
> printed or shared in isolation). If the two ever disagree, the
> standalone `docs/SETUP.md` is canonical — this section is kept in
> sync but the standalone file is the version operators should quote.

This is the single source of truth for going from a fresh
`git clone` to a live production deployment. Follow it top-to-bottom;
each step lists the exact commands and the exact Vercel / Supabase
UI clicks you need.

If anything here disagrees with the README, the README is older —
this section is canonical for the deployment flow.

**17.0 Prerequisites**

You need accounts / CLI tools for:

- **GitHub** — repo lives there
- **Vercel** — hosts the Next.js app
- **Supabase** — Postgres + auth + storage
- **Gemini** — chat / STT / TTS model API
- **Supabase CLI** (`supabase`) — for migrations and type-gen
- **Node.js 18.18+** — see `engines` in `package.json`

A Vercel team on the **Pro plan or higher is strongly recommended**
for production. The two Vercel crons (`purge-deleted-accounts`,
`memory-consolidate`) work on Hobby but with a 10s function timeout —
fine for an early user base, not for a thousand-user production load.

**17.1 Local first**

The fastest way to know the app is wired correctly is to run it
locally against the Supabase dev stack before touching any cloud
project.

```bash
npm install
cp .env.example .env.local
# Leave the values as placeholders for now; you'll fill in real
# values from `supabase start` in the next step.
npx supabase start
```

`supabase start` prints a block of local credentials. Copy them into
`.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=<API URL from supabase start>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key from supabase start>
SUPABASE_SERVICE_ROLE_KEY=<service_role key from supabase start>
```

Apply the migrations and seed data (this happens automatically the
first time you `supabase start`, but to re-run later):

```bash
npx supabase db reset
```

Regenerate the typed `Database` interface so the rest of the codebase
sees your local schema:

```bash
npm run db:types
```

Run the four local gates and confirm they pass:

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

If any of these fail, the production deploy will fail in the same
way — fix locally first.

Run the dev server and sign up at `http://localhost:3000/sign-up` to
prove the full onboarding / mentor / voice loop works end-to-end:

```bash
npm run dev
```

**17.2 Create the Supabase project (one per environment)**

In the Supabase dashboard:

1. **New project** — name it e.g. `vam-production`. Pick the same
   region your Vercel project is in. Set a strong database password
   and **save it** — you'll need it for migrations.
2. Wait for the project to provision.
3. **Settings → API**: copy the **Project URL**, **anon public**
   key, and **service_role** key. Treat the service_role key like a
   password — it bypasses RLS.
4. **Settings → Database → Connection string → URI**: copy the
   "Direct connection" string. The password is the one you set in
   step 1. (The pooler URL is for runtime; the direct URL is for
   `supabase db push`.)

**Storage bucket (one-time, per project)**

The `voice-sessions` bucket is created by migration
`0028_voice_sessions_bucket.sql`, which is part of the standard
migration set, so it'll appear automatically the first time you push
migrations (§17.3). No manual bucket creation needed.

If you ever need to create it manually (e.g. for a one-off test
project), in the Supabase dashboard navigate to **Storage → New
bucket** with name `voice-sessions` and toggle **Private bucket**
on. The four RLS policies (one each for SELECT, INSERT, UPDATE,
DELETE) are also part of migration 0028.

**17.3 Apply the migrations**

The schema lives in `supabase/migrations/*.sql` and is the single
source of truth for the database. To apply pending migrations to a
new project:

```bash
supabase link --project-ref <ref-from-dashboard-url>
supabase db push --linked --dry-run   # review first
supabase db push --linked
```

The dry run shows what will change before anything is applied. If
it doesn't match what you expect locally, **stop** and investigate
before pushing for real.

**Migration safety rules** (forward-only, additive-by-default):

- **Never edit a migration that has already been applied to any
  shared environment** — add a new migration instead, even to fix
  a mistake in an old one.
- Migrations in this repo use `add column if not exists`,
  `create table if not exists`, etc. — safe to run against a live
  database with active traffic.
- For a migration that isn't safely additive (renaming/dropping a
  column another part of the app still reads, changing a type in
  a way existing rows might violate), split it into two deploys:
  (1) a migration + code change that stops reading/writing the
  old shape while the old shape still exists; (2) a follow-up
  migration that actually removes it.
- For a full environment reset (staging/dev only, **never
  production**): `supabase db reset --linked`.


**17.4 Create the Vercel project**

1. **Import Git Repository** — go to vercel.com/new, select this
   repo, click Import.
2. **Configure Project** — leave the Framework Preset as Next.js.
   **Do not** override the Build Command, Output Directory, or
   Install Command unless you have a specific reason to.
3. **Add environment variables** before the first deploy — see the
   full list in §14, but the minimum to get a green build is the
   four `NEXT_PUBLIC_SUPABASE_*` + `SUPABASE_SERVICE_ROLE_KEY` +
   the four `GEMINI_*` + `INTERNAL_CRON_SECRET`. Set them in
   Vercel's project settings, scoped per environment (Production
   vs Preview).
4. **Deploy** — click Deploy. The first build will fail at the
   `prerender` step if any of the `NEXT_PUBLIC_SUPABASE_*` values
   are missing or wrong. Read the error message; it's almost
   always a missing env var.
5. **Connect to a production Supabase URL** — the
   `vercel.json` `crons` block only fires on **Production**
   deployments, not Preview. So the `INTERNAL_CRON_SECRET`-gated
   `/api/internal/*` routes will be invoked by Vercel
   automatically once a day against the production database.
   See §17.5.

**17.5 Wire the Vercel crons**

Two Vercel Cron jobs are declared in `vercel.json`:

| Path | Schedule | Auth |
| --- | --- | --- |
| `/api/internal/memory-consolidate` | `0 3 * * *` (03:00 UTC) | `INTERNAL_CRON_SECRET` |
| `/api/internal/purge-deleted-accounts` | `0 6 * * *` (06:00 UTC) | `INTERNAL_CRON_SECRET` |

Vercel invokes these automatically, sending
`Authorization: Bearer $INTERNAL_CRON_SECRET`. The route handlers
use `hasValidCronSecret(request)` from `@/lib/api/cron-auth`,
which compares with `timingSafeEqual` against the same env var
configured in the Vercel project. A mismatch returns a uniform
401.

**Manual invocation for testing** (e.g. against a preview
deployment):

```bash
curl -i -X POST https://<your-vercel-url>/api/internal/memory-consolidate \
  -H "Authorization: Bearer $INTERNAL_CRON_SECRET"
```

**17.6 Configure Supabase auth URLs**

In **Supabase Dashboard → Authentication → URL Configuration**:

- **Site URL**: the production Vercel URL (e.g. `https://vam.app`)
- **Additional redirect URLs**: add every environment the app
  runs in — `https://vam.app/auth/callback`,
  `https://staging.vam.app/auth/callback`, the Vercel preview
  pattern (`https://*-<team-slug>.vercel.app/auth/callback`),
  and `http://localhost:3000/auth/callback` for local dev.

If Google OAuth is enabled, configure its OAuth client
credentials in **Authentication → Providers → Google** — these
do not carry over from a different environment automatically.

**17.7 Configure transactional email templates**

The Supabase auth templates (sign-up confirmation, password
recovery, magic link) need to be configured per-env. The
`.env.example` file lists the redirects; the actual template
text is whatever Supabase ships with by default. For production,
customize these templates in **Supabase Dashboard →
Authentication → Email Templates** so they look like VAM, not
generic Supabase.

**17.8 First-deploy verification**

After the first production deploy:

- [ ] Vercel build is green
- [ ] CI is green on the deploy commit (lint, typecheck, tests,
      build, `verify-migrations`)
- [ ] A fresh sign-up at the production URL completes onboarding
- [ ] The 4 onboarding legal checkboxes are present and required
- [ ] `legal_acceptances` has 4 new rows for that test user
- [ ] `user_preferences` has 1 row for that test user
- [ ] Chat with the assigned mentor in **text mode** works
- [ ] Chat with the mentor in **push-to-talk voice mode** works
- [ ] Chat with the mentor in **live voice mode with barge-in**
      works
- [ ] Soft delete via `/account/delete` redirects to
      `/account/restore` and (after 30 days) the
      `purge-deleted-accounts` cron deletes the account
- [ ] A manual `curl` to
      `/api/internal/memory-consolidate` returns
      `{"scannedUsers": N, ...}` and not 401
- [ ] `INTERNAL_CRON_SECRET` rotated in Vercel (one-time
      exercise) and the crons still work

**17.9 Extending the system**

**Adding a new internal cron route**

1. Add a Route Handler under `src/app/api/internal/<name>/route.ts`
   that calls `hasValidCronSecret(request)` from
   `@/lib/api/cron-auth` and returns `401` on failure.
2. Add an entry to `vercel.json` with a `schedule` and the
   standard `Authorization: Bearer <INTERNAL_CRON_SECRET>`
   header (or rely on the env-var-driven default).
3. Update §17.5 above.

**Adding a new legal document**

Legal documents are versioned, append-only, and require
re-acceptance. To publish a new version of, say, the Terms:

1. Edit the `src/app/legal/terms/page.tsx` content.
2. Add a new row in `supabase/migrations/<next>_terms_v2.sql`:
   ```sql
   insert into public.legal_documents (name, slug, version, published_at)
   values ('Terms of Service', 'terms-of-service', '2026-01-01', now());
   ```
3. Run `npx supabase db push`.
4. Every user who accepted the previous version will be routed
   through `/legal/re-accept` on their next request (after the
   24h cookie freshness window from ADR-003). The new version
   MUST also be added to `REQUIRED_LEGAL_SLUGS` in
   `src/lib/legal/required-slugs.ts` if it's a *new* document
   (not a re-version of an existing one).
5. Re-run `npm run db:types` and commit.


### 18. Staging readiness

This section is the historical record of the Phase 1A staging
checklist, now superseded by §17 for new deploys. It is preserved
here as provenance for the verification procedures that the §17
first-deploy checklist (17.8) is distilled from.

**18.1 Migration validation procedure**

1. Migrations live in `supabase/migrations/*.sql`, applied in
   numeric order. **Never edit a migration that has already been
   applied to any shared environment** — add a new migration
   instead.
2. Before merging any PR that touches `supabase/migrations/`,
   confirm the `verify-migrations` job in
   `.github/workflows/ci.yml` passed. It boots a real local
   Supabase stack and applies every migration from scratch.
3. To validate locally before pushing: `supabase start`,
   `supabase db diff` (should show no unexpected drift),
   `supabase stop`.
4. To apply pending migrations to a linked project manually:
   `supabase link --project-ref <ref>`, `supabase db push --linked
   --dry-run` (review), `supabase db push --linked`.

**18.2 Backup recommendations**

- Enable Supabase's built-in daily backups (or Point-in-Time
  Recovery on a paid plan) for any project holding real user
  data, before onboarding real users to staging with realistic
  data volumes.
- `legal_acceptances` is the most compliance-sensitive table in
  the schema — backup/restore drills for this table are a
  pre-launch checklist item.

**18.3 Compliance — legal acceptance validation**

Before staging is opened to any real (non-team) user:

1. **Replace every placeholder in every document under
   `src/app/legal/`.** As of the Phase 1A audit, all 11 legal
   document pages (including all 4 that gate onboarding: Terms
   of Service, Privacy Policy, Acceptable Use Policy, AI
   Consent) contain literal `[Insert Date]` placeholder text.
   This must go through actual legal review before any real
   user sees it — engineering fixed the *system* (versioning,
   audit trail, enforcement), not the *text*, and the text is
   a legal/business deliverable.
2. Confirm `REQUIRED_LEGAL_SLUGS`
   (`src/lib/legal/required-slugs.ts`) matches exactly the set
   of documents legal/compliance says must be gated.
3. Confirm with legal/compliance whether bundling all four
   required documents under a single onboarding checkbox
   (current implementation) is acceptable, or whether
   `ai-consent` in particular needs its own separate checkbox
   per jurisdiction.

**18.4 Re-acceptance verification** (after publishing a new
document version, manually verify with a test account):

1. Confirm the account (previously onboarded, previously
   accepted the old version) is redirected to `/legal/re-accept`
   on its next protected-route request.
2. Confirm `/legal/re-accept` shows only the documents that
   actually changed, not the ones that didn't.
3. Confirm accepting writes a **new** row to `legal_acceptances`
   (not an update to the old one) and the old row is untouched.

**18.5 Security review checklist**

- `SUPABASE_SERVICE_ROLE_KEY` set only in Vercel's server env,
  never `NEXT_PUBLIC_`-prefixed.
- Every use of `createAdminClient()` is preceded by
  `verifyAuthenticatedUser()` in the same request — grep
  `createAdminClient` and confirm each result's call site.
- CI's "Lint for leaked server-only secrets" step is a cheap
  grep-based guard, not a full bundle analyzer.
- RLS is enabled on every table with owner-scoped policies.
- Column-level grants restrict which `profiles` columns a user
  can self-update (see ADR-001) — `plan`,
  `onboarding_completed_at`, and `deleted_at` are not
  client-writable even though the row itself is owned by the
  user.
- Soft-deleted accounts (`profiles.deleted_at` set) are rejected
  by `verifyAuthenticatedUser()` (all privileged API routes)
  and by the `(app)` layout (all authenticated pages) — confirm
  this still holds for any new privileged route or route group.

**18.6 CI branch protection**

Branch protection on `main` should require, at minimum:

- `CI / build` (lint, typecheck, unit tests, build, secret-leak
  check)
- `CI / verify-migrations` (migrations apply cleanly from
  scratch)

This is a GitHub repository setting, not a file in the repo —
confirm it directly in GitHub: Settings → Branches → Branch
protection rules → `main`.

**18.7 Deployment order**

1. PR merges to `main` → `CI` workflow runs (build +
   verify-migrations).
2. `CI` succeeds → `Deploy Supabase Migrations` workflow runs
   automatically (`workflow_run` trigger), applying pending
   migrations to the linked Supabase project.
3. Vercel's own GitHub integration deploys the app to
   Production independently, triggered by the same push.

**Known ordering caveat:** steps 2 and 3 are not strictly
sequenced against each other. This is safe as long as every
migration is additive/backward-compatible (all current
migrations are). If a future migration is breaking, sequence
it as two migrations across two releases (deprecate-then-
remove), or disable Vercel's automatic git deploy and trigger
it via a Vercel Deploy Hook after the migration deploy
succeeds.


### 19. Build verification & troubleshooting

The four local quality gates (re-run before every push):

```bash
npm run typecheck   # TypeScript strict
npm run lint        # ESLint (Next.js default + import plugin)
npm test            # Vitest unit + integration (integration self-skips)
npm run build       # next build, catches static-prerender regressions
```

As of the latest audit, all four pass with: 0 typecheck errors,
0 lint errors, 122 tests passing / 6 skipped, 0 build errors
across 28 API routes + 16 page routes.

**Common failure modes:**

| Symptom | Likely cause | Fix |
|---|---|---|
| `supabase start` fails to bind a port | Another Supabase stack is running | `supabase stop --no-backup` |
| `npm run db:types` errors "project not linked" | Expected when no project is linked | Run `npx supabase link --project-ref <ref>` first |
| Sign-in succeeds but every page returns 401 | `NEXT_PUBLIC_SUPABASE_URL` env var doesn't match the project | Re-check Vercel env vars, redeploy |
| Mentor chat returns 502 "AI model configuration is missing" | `GEMINI_MODEL_CHAT` / `GEMINI_MODEL_UTILITY` env vars not set | Set them in Vercel, redeploy |
| Voice TTS returns 502 | `GEMINI_MODEL_TTS` env var not set, or Gemini model id has been deprecated | Check https://ai.google.dev/gemini-api/docs/deprecations, update env var |
| Cron returns 401 | `INTERNAL_CRON_SECRET` env var mismatch | Make sure Vercel has the same value the route expects |
| `voice-sessions` upload fails with 403 | RLS policy missing | Confirm migration 0028 applied; check `select * from pg_policies where tablename = 'objects' and policyname like 'voice_sessions%'` |
| Production build fails with "Module not found: Can't resolve 'zod'" | A new dep was added but `npm install` not run | `npm install` locally, then push the updated `package-lock.json` |

---




## Part 4 — Delivery history & roadmap

### 20. Current implementation baseline

**Status as of the latest audit:**

| Domain | Status | Notes |
| --- | --- | --- |
| Identity, sessions, onboarding | Implemented | Supabase Auth, profile trigger, protected routes, professional identity fields. Needs live-environment QA. |
| Privacy and legal acceptance | Implemented foundation | Versioned acceptance ledger and re-acceptance flow exist. Legal copy still has placeholders and requires legal approval (see §18.3). |
| Mentor text chat | Implemented | Streaming Gemini chat, mentor assignment, persistence and prompt assembly exist. Requires real-key/evaluation QA. |
| Mentor memory | Implemented baseline | Typed durable memory, extraction, consolidation and relevance ranking exist. No embedding retrieval yet (see §23 — deliberate gap). |
| Voice | Implemented push-to-talk + live barge-in | STT/TTS and playback support exist. No full-duplex guarantee (see §24). |
| Goals, action plans, progress | Implemented baseline | Progress snapshots, action plans, streaks and personal insights exist. |
| Assessments | Implemented baseline | Template, response and scoring paths exist. Communication DNA remains incomplete as an explicit, viewable profile. |
| Journeys and curriculum | Implemented baseline | Generic journey infrastructure and the 30-day programme are present in migration 0026. Industry scenarios are still content work. |
| Collective Intelligence | Implemented foundation | Migration 0027 adds consent, a minimum cohort size of 10, aggregate insight records, and a manual publish UI. Automated aggregation worker and admin audit logs are not. |
| Soft delete + restore | Implemented | 30-day restore window + nightly purge cron + middleware redirect. |
| Memory consolidation cron | Implemented + wired | `vercel.json` cron at `0 3 * * *`; per-user scan with 25/run cap. |
| Data export | Implemented | `/api/export` returns the full user-data JSON. |
| Rate limiting | Not implemented | Acceptable for soft launch. |
| Observability | Partial | `X-Request-Id` on `/api/internal/*`; `console.error` elsewhere. No Sentry. |
| Accessibility audit | Not done | Semantic HTML + Tailwind defaults; not tested with a screen reader. |

**Database migrations: 28 forward-only SQL files** in
`supabase/migrations/`. The `voice-sessions` Storage bucket
(migration 0028) is private with four owner-scoped RLS policies
keyed on `auth.uid()` matching the first path segment.

**Test coverage: 122 passing / 6 skipped across 18 unit-test
files.** Integration tests self-skip unless
`RUN_INTEGRATION=1` is set with disposable `TEST_SUPABASE_*`
secrets configured.

**Documented gaps not addressed** (deferred to §25 Stages 5–6):

1. Collective-intelligence automation worker (consent exists,
   schema exists, UI exists; the worker doesn't).
2. Rate limiting on `/api/chat`, `/api/voice/*`,
   `/api/assessments/submit`.
3. Observability beyond `console.error` (Sentry / Logflare).
4. Accessibility audit.
5. Admin collective-insights page (API exists; UI doesn't yet
   render it as a first-class admin surface).
6. Memory embedding retrieval (the column exists; no provider
   chosen yet).
7. CI-wired integration tests (currently self-skip; need
   `TEST_SUPABASE_*` secrets + a CI step that sets them).
8. Real legal text (placeholder content currently ships).
### 21. Phase 1A final audit (collapsed)

This is the historical record of the Phase 1A Final Production
Readiness Audit — the moment the codebase was confirmed
production-ready (with documented gaps) for the first time and
its CI was actually wired up to run on GitHub. The original
`PHASE-1A-FINAL-AUDIT.md` (289 lines) is preserved in spirit
here; what follows is the executive summary, since every
finding has since been fixed or incorporated into §20.

**Executive summary**

The Foundation Hardening implementation (legal acceptance
system, profile foundation fields, soft delete column,
`user_preferences`, admin-client safety helper, CI/CD workflows,
tests, ADRs) was substantially well-built: the database schema
is sound (proper FKs, uniqueness constraints, RLS, idempotent
triggers), the legal-acceptance versioning/re-acceptance design
is genuinely correct and self-healing under failure, and the
`verifyAuthenticatedUser()` pattern is a real, working
centralization of the service-role safety check.

However, one **critical** finding meant the codebase's own
claim of "currently passes lint/typecheck/tests/build" was
true only as a local statement, not as an enforced fact:
**both GitHub Actions workflow files were committed to
`.github/workflow/` (singular) instead of `.github/workflows/`
(plural)**, so neither CI nor the automated migration
deployment had ever actually run on GitHub. This was fixed
during the audit.

**Findings and dispositions** (full per-finding text is in the
git history of `docs/PHASE-1A-FINAL-AUDIT.md`):

- **C1 — CI workflows were never discoverable by GitHub.**
  Status: **Fixed** — both files moved to `.github/workflows/`.
- **H1 — No enforcement anywhere for `profiles.deleted_at`.**
  Status: **Fixed** — `verifyAuthenticatedUser()` now rejects a
  soft-deleted session; middleware redirects. See §15.3.
- **H2 — Legal document text is entirely placeholder content.**
  Status: **Open (not engineering)** — requires legal counsel
  to write real Terms / Privacy / AI Consent text before
  onboarding non-team users. See §18.3.
- **M1 — Onboarding route's two-write ordering is not atomic.**
  Status: **Open (low urgency)** — the re-accept flow is the
  self-healing safety net. Fix properly when the next
  multi-step privileged route lands.
- **M2 — Onboarding vs. re-accept consent UX inconsistency.**
  Status: **Open (legal/product decision)** — needs a
  legal/product call, not engineering.
- **M3 — Integration tests never run automatically.** Status:
  **Open** — see §20 gaps.
- **L1–L3 (low severity)** — rate limiting, structured logging,
  `verify-migrations` CI job end-to-end verification. All
  scoped to land before Stage 2 / Stage 5 / public launch.

**Verdict:** READY FOR STAGE 2 development. Sign-off to
onboard real (non-team) users additionally requires closing H2
(real legal text) and confirming branch protection in GitHub
repo settings.

### 22. Phase 1A foundation hardening

This is the change log for the hardening pass applied before
Phase 1B (mentor/Groq/voice), addressing the 8 CTO review
findings. None of Mentor, Groq, Memory, Communication DNA,
Voice, Assessments, Progress, Role Plays, Challenges,
Achievements, or Live Discussions was touched in this pass —
those were Phase 1B+ scope.

**What changed, by finding:**

1. **Legal Acceptance System** — `legal_documents` and
   `legal_acceptances` tables (migration 0007); the
   `src/lib/legal/acceptance.ts` required-slug list and
   service-role write helper; `/legal/re-accept` page +
   `/api/legal/re-accept` route; onboarding form now writes
   real acceptance rows; the `/legal/*` pages were also
   fixed (previously they were raw text with no component
   export — `next build` could not have been passing).
2. **Profile Foundation Fields** — `profession`,
   `experience_level`, `primary_goal` columns
   (migration 0008). Onboarding collects and persists them.
3. **Soft Delete Capability** — `profiles.deleted_at`
   (migration 0009). The deletion route, recovery UI, and
   cleanup job were deferred to a follow-up.
4. **User Preferences Table** — `user_preferences` (migration
   0010), auto-created by the `handle_new_user()` trigger
   with a backfill for pre-existing profiles.
5. **Automated Database Deployment** — the old workflow lived
   at `.github/workflow/sci.yml` (wrong directory name and
   typo'd filename); moved to `.github/workflows/ci.yml`;
   `ci.yml` now also runs `npm test` and a grep-based
   server-only-secret leak check; new
   `.github/workflows/deploy.yml` runs after CI succeeds on
   `main`, dry-run verifies migrations, then applies them.
6. **Admin Client Safety** — `src/lib/supabase/auth-guard.ts`
   exports `verifyAuthenticatedUser()`, the required first
   call before any Route Handler touches `createAdminClient()`
   (see ADR-002). Both `/api/onboarding/complete` and
   `/api/legal/re-accept` use it.
7. **Foundation Testing** — `vitest.config.ts`, `tests/`
   (unit + integration split, with integration tests
   self-skipping). Covers all 5 priority areas from the
   review.
8. **Architectural Decisions** — `docs/adr/ADR-001` through
   `ADR-004` (kept as separate files; see §27).

**Explicitly out of scope for this pass** (deliberate
follow-ups, not oversights): the account-deletion route and
cleanup job (now done in §15.3), an admin UI for publishing
new legal document versions, and CI-wired integration tests
against a live test project.


### 23. Stage 2/3/4 implementation notes

This section preserves the scope decisions and known gaps
from when Mentor + Chat (Stage 2), Goals / Action Plans /
Better Memory / Progress Analytics / Mentor Quality (Stage 3),
and Assessments / Coaching Frameworks / Personalised Coaching
Journeys (Stage 4) were built — so none of this is mistaken
for oversights later.

**23.1 Mentor matching engine wasn't in the original
blueprint**

The original Phase 1 blueprint specified a single, fixed mentor
persona. Stage 2 was asked for explicitly as a matching engine
across multiple personas, so four mentor personas
(`the-coach`, `the-guide`, `the-strategist`,
`the-sparring-partner`) were seeded in migration 0011 and a
deterministic scoring engine
(`src/lib/mentor/matching.ts`) picks between them based on the
profile/preference fields already collected during
onboarding. This is a genuine scope expansion, done
deliberately, not a misreading of the original architecture
doc.

**23.2 Not live-tested: Gemini API (originally Groq — migrated in a later provider swap, not part of the numbered Stage roadmap in §25)**

Neither `api.groq.com` (originally) nor
`generativelanguage.googleapis.com` (after the Gemini migration) is
reachable from the development sandbox where this was built. Every
AI-provider-calling function (`src/lib/ai/client.ts`: chat completion
streaming via Gemini's OpenAI-compatible endpoint, JSON-mode
completion, transcription via native `generateContent` with an inline
audio part, speech synthesis via native `generateContent` with an
audio response modality) is implemented against Gemini's documented
API shape but has never actually been called. Before relying on this:

1. Verify `GEMINI_MODEL_CHAT`, `GEMINI_MODEL_UTILITY`,
   `GEMINI_MODEL_STT`, `GEMINI_MODEL_TTS` in `.env.local`/Vercel
   are real, currently-available Gemini model ids — Google's model
   catalog moves fast and deprecates on a published schedule (see
   https://ai.google.dev/gemini-api/docs/models and
   https://ai.google.dev/gemini-api/docs/deprecations); this repo
   does not hardcode any model name, specifically so it can't
   silently go stale in code. As of the Gemini migration, the
   Gemini 2.5 family (including its TTS preview models) is
   scheduled to shut down 16 Oct 2026 — `.env.example` defaults to
   the Gemini 3.x line to avoid deploying against a model that's
   about to disappear, but re-verify this if you're reading it
   later than that date.
2. Verify Gemini's native `generateContent` audio-output response
   shape (`candidates[0].content.parts[0].inlineData.data`, base64
   PCM) matches what `synthesizeSpeech()` expects, and that the
   hand-written PCM→WAV header in `pcmToWav()` produces audio the
   browser actually decodes — implemented from Gemini's documented
   shape, not a verified live response. `tests/unit/wav-encoding.test.ts`
   verifies the header's byte layout in isolation, which is not the
   same as verifying real PCM bytes from a real API call decode
   correctly end-to-end.
3. Run one real end-to-end chat turn against a real `GEMINI_API_KEY`
   before trusting the SSE-parsing logic in `mentor-chat.tsx` and
   `readAiSseText()` in `/api/chat/persist-reply.ts` — both assume
   Gemini's OpenAI-compatible endpoint emits the standard OpenAI-style
   `data: {"choices":[{"delta":{"content":"..."}}]}` SSE chunk shape,
   which Google documents but this repo has not independently
   confirmed against a live response.
4. Stage 3/4 add three more AI-provider-calling functions with the
   same caveat: `generateWeeklyActionPlan`,
   `consolidateMemoriesIfNeeded`, and `submitAssessment` — none have
   been called against a live Gemini key either.
5. Run one real `transcribeAudio()` call against a real voice
   recording — the inline-audio-part request shape in
   `src/lib/ai/client.ts` is new as of the Gemini migration and has not been
   exercised against real audio bytes at all (Groq's separate
   `/audio/transcriptions` endpoint, which this replaced, was itself
   never live-tested either — see the equivalent caveat this section
   carried before the migration).

**23.3 No longer a hard blocker, but not yet implemented: embedding-based memory retrieval**

`memory_items.embedding` (migration 0014) exists in the schema
but is never populated or queried. Retrieval (`src/lib/memory/retrieval.ts`) ranks
purely by `importance x recency-decay`. This is fine for a
small number of memory items per user but will degrade as
memory grows — revisit once an embedding provider is chosen
(this only requires changing `getRelevantMemories`, not the
schema).

**23.4 Deliberate gap: memory extraction and progress
snapshots are synchronous, not queued**

The Phase 1 blueprint (§26.4) describes memory extraction as
a queued Postgres/pg_cron job. Stage 2 instead runs extraction
inline, after the streamed reply is buffered, inside the same
request's async tail (`persistFullReply` in
`/api/chat/route.ts`). This keeps the implementation simple
(no queue, no worker) and is fine for the current request
volume. The tradeoff is a per-request tail-latency
contribution from the extraction call; revisit if/when volume
justifies the queue.


**23.5 Mentor-authored writes vs. user-authored writes**

Stage 3 introduced a distinction that didn't exist before:
`action_plan_items` and `goals` are simple enough,
low-sensitivity user content that the client writes directly
via RLS (same justification as the original `goals` table).
`memory_items`, `assessment_responses`/`scores`, and
`user_journey_progress` are server-computed or
server-validated and therefore admin-client-only, following
the same pattern established in Phase 1A/Stage 2 — no new
security pattern was invented, existing ones were extended
consistently.

**23.6 Mentor quality feedback and message ids**

`/api/chat` streams a raw AI-provider SSE proxy and persists the
mentor's message asynchronously server-side — the client
never gets the message id back directly. The feedback UI
(`mentor-chat.tsx`) works around this with a best-effort poll
(two attempts, 400ms then 1200ms) against the `messages`
table after the stream ends. This is inherently racy: on a
slow persist, the thumbs up/down buttons simply won't appear
for that message, with no retry beyond the two attempts. If
mentor quality feedback becomes a priority metric, the
cleaner fix is having `/api/chat` emit the message id as a
custom SSE event (e.g. `event: message_id`) once
`persistFullReply` finishes, rather than polling for it.

**23.7 Memory consolidation threshold is an unvalidated
guess**

`CONSOLIDATION_THRESHOLD = 30` — 30 raw memory items before
consolidating into summaries is a reasonable starting point,
not a measured one. Revisit once real conversation volume
exists.

**23.8 Coaching journeys are content-light**

Coaching journeys currently seed only 2 of many possible paths
(`ace-interviews-4-week`, `executive-presence-6-week`),
matching only 2 of the 7 `primary_goal` options collected at
onboarding. Users with other primary goals will see the
journeys list but nothing tailored to their specific goal —
this is a content gap (more journeys need writing), not a
code gap.

**23.9 Progress analytics chart is hand-rolled SVG**

Deliberate — avoids adding a dependency (Chart.js/Recharts)
for a single sparkline. Revisit if Stage 5's "Enterprise
dashboards" needs genuinely richer visualizations (multi-
series comparisons, zooming, etc.).

**23.10 Security pattern for new privileged code**

Every new privileged operation (`/api/chat`,
`/api/voice/stt`, `/api/voice/tts`, `/api/mentor/rematch`)
starts with `verifyAuthenticatedUser()` before touching the
admin client, per ADR-002 and the Phase 1A audit's
established pattern — including the soft-delete rejection
added in that audit, which now also protects every Stage 2
route for free.


### 24. Voice architecture notes

The honest writeup of live conversation voice — what changed, why,
and what's still not verified.

**24.1 Retired: the Stage 6 client-VAD approximation**

The original "Go live" implementation (Stage 6) was not real
duplex audio streaming — Gemini's STT and TTS are REST-shaped
`generateContent` calls (see §23.2), not a WebSocket/realtime API, so
there was no way to open one persistent bidirectional audio socket to
the provider directly. What existed instead: a continuous mic stream
with client-side energy-threshold VAD (`src/lib/voice/vad.ts`)
guessing when the user started/stopped talking, each detected
utterance sent through the same segment-based STT -> chat -> TTS
pipeline push-to-talk uses, with "barge-in" implemented as the client
aborting the in-flight `/api/chat` fetch the instant VAD fired. This
worked, but the barge-in was a client-side heuristic (false-triggered
on the mentor's own TTS output bleeding into the mic — partially
mitigated by requesting `echoCancellation` on `getUserMedia`, but
never eliminated) and STT only ever saw complete utterances after a
silence timeout, never a live partial transcript.

This mode has been **deleted**
(`use-live-conversation.ts`/`use-voice-activity-detection.ts` are gone
from `src/hooks/`) and replaced by §24.2 below. `vad.ts` itself
survives only because `MIC_CONSTRAINTS` is still shared by every
mic-capture call site — its VAD decision logic is currently unused by
any hook, kept as a tested, correct piece of pure logic in case a
future degraded-connectivity fallback ever needs client-side turn
detection again.

**24.2 Current: the Gemini Live relay**

"Go live" now uses genuine full-duplex audio via Gemini's Live API —
a persistent bidirectional WebSocket that handles listening, turn
detection, and interruption on Gemini's own server side, not a client
heuristic layered on top of request/response calls. This required a
new piece of infrastructure `/api/chat` and `/api/voice/*` didn't:

- **`deploy/live-relay/`** — a small, separate, always-on Node
  process (deployed to Fly.io — see that directory's `README.md` for
  why Fly over Railway/a raw VPS for this specific workload) that
  holds the actual outbound Gemini Live WebSocket open for the
  duration of a conversation. This exists because Vercel serverless
  functions (everything else in this app) cannot hold a persistent
  connection open across a whole conversation — a function invocation
  ends, it doesn't idle-wait for the next audio chunk.
- **`/api/voice/live-session`** — mints a short-lived signed token
  (`src/lib/voice/live-session-token.ts`) carrying the already-built
  mentor system prompt and resolved voice name, so the relay never
  needs its own Supabase client or a second copy of
  `src/lib/ai/prompts.ts`'s assembly logic — it stays a small, mostly
  stateless relay.
- **`src/hooks/use-gemini-live.ts`** + `public/audio-worklets/
  pcm-capture-worklet.js` — the browser side: an AudioWorklet
  captures mic audio as 16-bit PCM at 16kHz (what Gemini Live expects)
  and streams it over the WebSocket; a separate 24kHz playback
  `AudioContext` schedules Gemini's spoken reply back-to-back for
  gapless audio; an `{"type":"interrupted"}` control frame from the
  relay (forwarded straight from Gemini's own `serverContent.interrupted`)
  is what stops playback for real barge-in now, not an energy
  threshold guess.

Text transcripts for the on-screen chat history come from Gemini's
own input/output transcription (enabled in the relay's `setup`
message), forwarded as `userTranscript`/`mentorTranscript` control
frames — the conversation is audio end-to-end, but the UI still shows
it as a normal message list.

**24.3 What's still open**

- **Not live-tested.** Same caveat as everywhere else Gemini is
  called in this codebase (§23.2) — this was built with no network
  path to `generativelanguage.googleapis.com` or to Fly.io. Before
  trusting it: deploy the relay, set real `GEMINI_API_KEY` /
  `LIVE_RELAY_SECRET` on both sides, and run one real conversation,
  watching the relay's logs for the actual shape of Gemini's
  `setupComplete`/`serverContent` messages — `server.mjs`'s docstring
  lists the specific things (voice config placement, transcription
  config placement) that are implemented from documented shapes but
  not confirmed against a live session.
- **Turn persistence has a narrower edge case than /api/chat's.**
  `/api/voice/live-turn` persists each completed turn (same
  `persistMentorMessage` pipeline /api/chat uses), fired from the
  browser on the relay's `turnComplete` signal — so reloading mid-
  conversation only loses the *current, still-in-progress* turn, not
  the whole conversation the way an earlier version of this gap
  described. That in-progress-turn loss is inherent to firing
  persistence on turn completion rather than incrementally, and isn't
  fixed here.
- **Voice-name-to-gender mapping** (`src/lib/voice/provider.ts`) is a
  best guess from Gemini's short voice descriptions — same caveat
  noted there, applies here too since Live mode uses the same
  `resolveVoiceId`.


### 25. Roadmap (Stages 5–7)

**Stage summary at a glance**

| Stage | Title | Status | Evidence |
| --- | --- | --- | --- |
| 1 | Foundation (auth, DB, UI shell) | DONE | Migrations 0001–0025 applied; `(auth)` + `(app)` route groups build and pass middleware |
| 2 | Mentor + chat (Groq, matching — provider later migrated to Gemini in an unnumbered follow-up change, not a formal Stage) | DONE | `src/lib/mentor/*`, `src/lib/ai/*`, `/api/chat` streams + persists; 7 mentor-matching + 13 prompt-assembly tests |
| 3 | Onboarding + assessments + journeys | DONE | 5-step onboarding, 2 seeded journeys, scoring, action-plan generation |
| 4 | Voice + 30-day program + soft delete | DONE | `/api/voice/{stt,tts}`, `src/lib/voice/*`, 30-day program content in migration 0027, soft-delete + restore + 30-day purge cron |
| 5 | **Soft launch** | **NEXT** | See §25.1 |
| 6 | **Polish** | **TBD** | See §25.2 |
| 7 | **Public launch** | **TBD** | See §25.3 |

**25.1 Stage 5 — Soft launch (NEXT)**

**Goal:** A live, working VAM at a private URL that a small
group of friendly users can use daily, and that the team can
demo without embarrassment.

**Definition of done:**

- `https://staging.vam.app` reachable, mirroring prod schema
  (see §17 for setup)
- A small set of seed users (5–10) signed up, onboarded, and
  on day 3+ of the 30-day programme
- The 4-gate CI suite (lint, typecheck, tests, build) green
  on `main`; the `verify-migrations` job also green
- The `purge-deleted-accounts` and `memory-consolidate` crons
  are firing, both authenticated
- All gaps from §20 are addressed **or** explicitly deferred
  to Stage 6 with a written rationale
- The team has run the §17.8 first-deploy checklist end to
  end on the staging environment
- No `console.error` on a normal day-1 user flow

**Scope of work (concrete subtasks, each its own PR):**

5.1 **Collective intelligence aggregation worker** (2-3 days)

- Design the exact input/output contract (which metrics are
  aggregated; what suppression rules apply). Get privacy
  review sign-off in writing before implementation.
- Build the worker as a Vercel cron at e.g. `0 4 * * *`.
- Automated tests prove no raw / low-count output can be
  published.

5.2 **Memory embedding provider** (1-2 days)

- Pick an embedding provider (the natural fit is whatever the
  chosen chat model's vendor offers). The schema is already
  shaped for this (§23.3) — only `getRelevantMemories` needs
  to change.

5.3 **Rate limiting** (1-2 days)

- Per-user / per-IP limiter on `/api/chat`, `/api/voice/*`,
  `/api/assessments/submit`. Postgres counter (no Redis
  dependency) is fine for soft launch.

5.4 **Email templates** (0.5 day)

- Customize the Supabase Auth email templates
  (sign-up confirmation, password recovery) so they look like
  VAM, not generic Supabase.

5.5 **Persona swap in settings** (0.5 day)

- `/settings/profile` lets a user change persona (currently
  locked in at onboarding; see §3).

5.6 **Mentor rematch UI** (0.5 day)

- The "Try a different mentor" button on `/mentor` (already
  built per §4). Add the visual treatment (loading state,
  toast confirmation) and ensure it appears on every visit
  to `/mentor`.

5.7 **Admin collective-insights page** (1-2 days)

- The API exists; build the page at `/admin` for publishing
  and reviewing aggregate insights.

5.8 **Real legal text** (depends on legal review)

- Replace placeholders in `src/app/legal/*/page.tsx` (see
  §18.3). This is a content/legal deliverable, not
  engineering.

5.9 **Observability baseline** (1 day)

- Sentry for errors; structured JSON logging with
  `X-Request-Id` already implemented on `/api/internal/*`.
- A runbook at `docs/RUNBOOK.md` covering: Supabase outage,
  Gemini outage, Vercel outage, leaked `INTERNAL_CRON_SECRET`,
  leaked `SUPABASE_SERVICE_ROLE_KEY`.

5.10 **Staging-readiness checklist walk-through** (1 day)

- Walk through §17.8 end to end on the staging environment.
  Document anything that needs adjusting; merge the
  adjustments as a single PR.


**25.2 Stage 6 — Polish (TBD)**

A scope refinement pass once Stage 5 users are producing
real feedback. The expected work, in priority order:

- Telemetry-driven UX fixes (the user pain points
  real-people-on-real-Staging actually hit)
- More content: 5–10 more coaching journeys so the §23.8
  content gap is closed
- Admin tooling: support tools, feature controls, audit
  events, data-quality reporting
- A first charting library replacement (Recharts) for the
  progress dashboard if the hand-rolled SVG sparkline is
  insufficient (§23.9)
- Accessibility audit (a11y tools + screen-reader
  walkthrough)
- Mentor voice asset pipeline (recorded human intros for
  each mentor, spliced into TTS output) — see open question
  1 in §25.4

**25.3 Stage 7 — Public launch (TBD)**

A controlled public release with measurable reliability.
Scope (compressed):

- Marketing site (landing page, "How it works," pricing
  block, footer with legal links) — build with the same
  component library; no new stack
- Pricing & billing (Stripe default; three tiers: Free,
  Pro, Pro Annual)
- Security audit & pen test (OWASP top-10; review admin
  client usage, service-role handling, rate limiter, cron
  auth, legal audit trail, export route, OAuth callback)
- GDPR / CCPA final review (data export spot-check;
  hard-delete cron drill; cookie banner review)
- Reliability pass: enable Vercel Fluid Compute if
  available; configure regional edge for static legal
  pages
- Launch comms and support: support@ email, public status
  page backed by the same `/api/health` route, one-page
  launch announcement

**Stage 7 exit criteria:**

- 50 real users have completed a 7-day soft launch with
  >40% Day-7 retention
- No P0/P1 from the security audit is open
- The runbook has been exercised at least once in a tabletop
  drill
- Marketing site, billing, and support are all live

**25.4 Open questions for the team**

- **Mentor avatar audio.** Today the mentor TTS is read by
  whichever PlayAI voice the prompt names. Is the plan to
  record human intros for each mentor ("Hi, I'm Maya...")
  and splice them in? If so, that needs an asset pipeline
  in Stage 5.
- **Custom journeys.** Is the 30-day program authoring
  surface (an admin page that adds a new program) in scope
  for Stage 6 or Stage 7? Today's journey content is in a
  migration, which is fine for the seeded journeys but
  won't scale.
- **Localization.** The §25.3 marketing mention is
  scaffolding only; the actual translation work is
  post-launch. Confirm with the marketing team which
  language goes first.
- **Mentor persona swap.** The product blueprint locks
  persona once assigned (see §3). The settings page does
  not yet let a user swap persona. Confirm whether that is
  a product gap or a deliberate decision.


### 26. Phase 1 historical design baseline (collapsed)

This section is the historical record of the original
**Phase 1 Technical Blueprint** (the 739-line
`docs/blueprint/VA-Phase1-Technical-Blueprint.md`). It is
preserved because it captures the design rationale the rest
of the codebase evolved from, even though the actual product
surface has since grown well past Phase 1.

If you need the full 739-line document, it's in the git
history of `docs/blueprint/VA-Phase1-Technical-Blueprint.md`
(or any tag/branch before this consolidation).

**26.1 Original Phase 1 MVP definition**

**What VA was at the time of the blueprint:** an AI
mentor/coaching SaaS product. A user talks to (or types with)
an AI mentor that remembers them across sessions and devices,
tracks their growth over time, adapts to how they personally
communicate ("Communication DNA"), and periodically assesses
their progress against goals.

**Phase 1 goal:** Ship a **single-mentor, single-user-persona**
product that proves the core loop:

```text
Sign up → Onboarding assessment → Talk to mentor (text + voice)
→ Mentor remembers & adapts → Progress is tracked → User returns (any device)
```

**What has changed since:**

- **Multiple mentor personas** (Maya, Jules, Sam, Priya) and
  a deterministic matching engine — see §4 and §23.1.
- **Four user personas** (anxious-avoider,
  overwhelmed-parent, career-changer, recovering-perfectionist)
  — see §3.
- **30-day curriculum** as the primary retention loop — §5.
- **Push-to-talk AND live barge-in voice** — see §8 and §24.
- **Weekly action plans** generated by Gemini — §6.
- **Collective Intelligence** foundation (consent, schema,
  admin back-office) — §9.
- **Soft delete + 30-day restore window + nightly purge
  cron** — §15.3.
- **Memory consolidation cron** wired into `vercel.json` —
  §7.
- **GDPR export + hard-delete compliance baseline** — §15.4.
- **`voice-sessions` private Storage bucket** with
  owner-scoped RLS — §8.


**26.2 In-scope / out-of-scope at the time of the original
blueprint** (vs. the current state — see §2 for the
up-to-date version):

**Was in scope:** email/OAuth, single workspace per user, one
configurable AI mentor persona, text chat, voice input
(speech-to-text) and voice output (text-to-speech) in
"walkie-talkie" (push-to-talk) mode, mentor memory,
Communication DNA, assessments, progress tracking dashboard,
multi-device sync, basic account settings, export, deletion.

**Was explicitly deferred:** multiple mentor personas /
mentor marketplace (now done in §4), real-time bidirectional
voice (now done in spirit via §24 but not literally
WebSocket duplex), group/team mentoring, payments/billing
(still deferred to Stage 7), native mobile apps (still
deferred), third-party integrations (still deferred),
fine-tuned/custom models (still deferred).

**26.3 Original success criteria** (vs. current state):

- A returning user on a new device sees identical mentor
  memory and history within <2s — **met** (Supabase is sole
  source of truth, RLS-scoped reads)
- Voice round-trip (speak → mentor speaks back) under ~3.5s
  p50 on Gemini — **partially met** (depends on the model
  choice and live measurement; sentence-streamed TTS
  improves time-to-first-sound)
- Assessment → Communication DNA → visibly different mentor
  tone, verifiable in a QA script — **partially met**
  (DNA is computed but the user-visible "Communication DNA"
  profile page is on the §25.2 backlog)
- Zero data loss / no client-only source of truth — **met**
  (Supabase is sole source of truth; the only client-local
  state is ephemeral VAD/UI state)

**26.4 Original schema sketch (vs. current state)**

The original blueprint specified a 7-table initial schema
(`profiles`, `mentors`, `conversation_sessions`, `messages`,
`memory_items`, `communication_dna_profiles`,
`assessment_templates`, `assessment_responses`,
`assessment_scores`, `goals`, `progress_snapshots`). The
current schema (28 migrations) extends this with:

- `legal_documents`, `legal_acceptances` (ADR-004)
- `user_preferences` (handle_new_user trigger)
- `action_plans`, `action_plan_items`
- `journeys`, `journey_days`, `journey_progress`
- `voice_sessions`
- `user_consents`
- `collective_intelligence_insights`
- `admin_users`
- `coaching_frameworks` (CBT/ACT/DBT/MI framework picker)
- `*_archive` / `*_summary` consolidation tables

The `memory_items.embedding` column was specified as a
`vector(1536)` (pgvector) from the start, anticipating the
embedding-based retrieval that §23.3 flags as still a
deliberate gap (no provider chosen).

**26.5 Original product surface** (vs. current — see §10 for
the up-to-date product list)

**Original routes:** `/`, `/auth/*`, `/dashboard`, `/mentor`,
`/mentor/[sessionId]`, `/assessments`, `/assessments/[slug]`,
`/progress`, `/settings/{profile,communication-dna,data,devices}`,
and `/api/{chat,voice/{stt,tts},assessment/score,memory/extract,export,account/delete}`.

**Current routes** add: `/account/{delete,restore}`,
`/legal/*`, `/legal/re-accept`, `/onboarding`,
`/journeys`, `/journeys/[slug]`, `/admin`,
`/api/internal/{purge-deleted-accounts,memory-consolidate}`,
`/api/mentor/rematch`, `/api/assessments/submit`,
`/api/assessments/templates`, `/api/journeys/advance`, and
several more; plus a comprehensive Supabase client set
(§12) and the `verifyAuthenticatedUser` choke point (§13).

**26.6 Original Vercel deployment architecture** (vs. current)

The original blueprint specified two Vercel environments
(Production + Preview), Supabase migrations applied via
`supabase db push` in CI, `vercel.json` for function pinning
and crons. All of that holds today (see §17.4 and §17.5),
with the addition of: the second cron (`memory-consolidate`),
the `verifyAuthenticatedUser` choke point as a build-time
contract for all new privileged routes (ADR-002), and the
explicit "additive-only migrations" invariant tracked by
`deploy.yml`'s dry-run step.

**26.7 Original threat model highlights** (vs. current)

The blueprint named six threat/mitigation pairs (forged
user_id, prompt injection, leaked Gemini key, Realtime channel
eavesdropping, malicious audio upload, account-deleted
session re-use). The current codebase addresses all six and
adds a seventh: the `verifyAuthenticatedUser` choke point
(ADR-002) is the codified mitigation for the "reach for the
admin client without first checking who's asking" class,
which the original blueprint treated implicitly as
"convention."


---

## Part 5 — Decision records

### 27. Architecture decision records

The full list lives in [`docs/adr/`](./adr/). They are
**kept as separate files** (not folded into this document)
because decision-record granularity is the right level of
detail for them — each ADR is a single, self-contained,
citable artifact.

The ADRs that bind the current shape:

- **[ADR-001 — Column-level grants](./adr/ADR-001-column-level-grants.md).**
  RLS is the primary authorization boundary; service role is
  the only bypass, and it is restricted to admin routes.
  (This is what `verifyAuthenticatedUser` exists to enforce.)
- **[ADR-002 — Service role isolation](./adr/ADR-002-service-role-isolation.md).**
  The admin client is never instantiated in a client
  component or an RSC, only in route handlers that have
  been audited to need it. `admin.ts` is marked
  `import "server-only"` (a build-time guarantee, not a
  code-review convention); `verifyAuthenticatedUser` is the
  greppable first call in any privileged route.
- **[ADR-003 — Cookie onboarding optimization](./adr/ADR-003-cookie-onboarding-optimization.md).**
  The `va_onboarding_done` and `va_legal_current` cookies
  let middleware skip the onboarding / legal re-accept gate
  on every navigation, instead of doing a DB round trip.
  The DB is still the source of truth — the cookies are a
  cache, and a stale cookie leads to a single redirect that
  re-syncs them.
- **[ADR-004 — Legal acceptance audit design](./adr/ADR-004-legal-acceptance-audit-design.md).**
  The `legal_acceptances` table is append-only and indexed
  by `(user_id, document_id, version)`; a user re-accepting
  never overwrites a prior row. Publishing a new version of
  an existing document automatically re-gates every user who
  only accepted the prior version, with no application code
  change per publish.

---

## Handoff protocol for future agents

1. Read this file end-to-end before changing
   schema/auth/privacy behaviour.
2. Treat `supabase/migrations/` as schema truth; regenerate
   `src/types/database.ts` after applying new migrations to a
   linked project.
3. Before touching privileged code, search `createAdminClient`
   and preserve the auth-then-authorization rule
   (`verifyAuthenticatedUser` first).
4. Update the relevant section of this document in the same
   change as any material capability change — §20 (current
   state), §22 (if the change is a hardening pass), §23/24
   (if the change is a stage deliverable), §25 (if the
   change advances a stage).
5. Run typecheck, unit tests, build, and any relevant live
   integration tests. Report skipped/unverified checks
   honestly.
6. Do not deploy, alter production data, change legal copy,
   enable an AI provider, or add an administrator without
   explicit user authority.


