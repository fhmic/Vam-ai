# VAM — Unified Blueprint

> **Single source of truth for the product, architecture, and
> delivery model.** This document is the consolidation of
> `PRODUCT-BLUEPRINT.md`, `STAGE-2-3-4-NOTES.md`, `STAGE-6-VOICE-NOTES.md`, the
> `docs/adr/*.md` ADRs, and the post-audit adjustments captured in
> [`CURRENT-STATE-AUDIT.md`](./CURRENT-STATE-AUDIT.md). The original
> stage notes are retained for history but **this file is what to
> hand a new agent.**
>
> **For what is built today and what is left, see
> [`CURRENT-STATE-AUDIT.md`](./CURRENT-STATE-AUDIT.md).**
> **For the ordered delivery plan, see [`ROADMAP.md`](./ROADMAP.md).**

---

## 1. What VAM is

VAM is a personal AI mentor that lives in your phone, on your
schedule, and that actually remembers you. It runs structured
30-day programs (currently anxiety + confidence), generates a
12-week personal action plan from your goals, lets you talk to
your mentor in real time by voice or text, and surfaces progress
insights you can share with a clinician if you choose.

It is **not** a chatbot. It is **not** a therapy app. It is a
coaching product — opinionated, evidence-informed (CBT, ACT, DBT,
motivational interviewing frameworks behind the same prompt
infrastructure), and built so that every piece of generated
content is auditable, every piece of user data is exportable,
and the user can hard-delete their account at any time with a
30-day recovery window.

## 2. Personas

Four user personas drive the matching, tone, and visual treatment
of the product. They are seeded in `supabase/seed.sql` and
referenced everywhere via the `persona` enum.

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
`/settings/profile` (not built yet, see
[`ROADMAP.md`](./ROADMAP.md) section 5).

## 3. Mentor

Four mentor candidates are seeded (`supabase/seed.sql`). They are
deliberately personas, not just voices: each has a bio, a
specialty area, a tone profile, and a model preference.

| Mentor | Specialty | Default tone | Model preference |
| --- | --- | --- | --- |
| `maya` | Anxiety, avoidance, slow starts | Gentle, validating | `GROQ_MODEL_CHAT` |
| `jules` | Career transitions, identity, ambition | Direct, warm | `GROQ_MODEL_CHAT` |
| `sam` | Burnout, perfectionism, recovery | Firm, kind | `GROQ_MODEL_CHAT` |
| `priya` | Parenting, context-switch, time | Practical, warm | `GROQ_MODEL_CHAT` |

Matching (`src/lib/mentor/matching.ts`) scores each candidate
against the onboarding profile and persona, applies deterministic
tie-breaks, and writes the result to `profiles.assigned_mentor`.
The `assignment.ts` helper is the single place that writes
`assigned_mentor_at`.

`/api/mentor/rematch` re-runs matching against the **same** persona
constraint. The UI entry point for rematch is not yet built (see
[`CURRENT-STATE-AUDIT.md`](./CURRENT-STATE-AUDIT.md) section 5).

The mentor prompt (`src/lib/groq/prompts.ts`) always carries:
- the active persona and mentor,
- the last 8 turns of conversation,
- the top 12 retrieved memories (see section 6),
- the active goal + next action,
- the user's timezone + program day,
- a hard-coded set of guardrails (no clinical claims, no
  diagnosis, no crisis-line advice, always offer a human
  resource if the user mentions self-harm).

## 4. The 30-day program

Each of the two seeded journeys (`anxiety-foundations`,
`confidence-foundations`) ships with a 30-day program:
30 ordered days, each with a short lesson + an action item.
The program is a journey, not a course — the user moves through
it on their own schedule, can pause and resume, and the day's
content is personalized by their persona and current progress.

Source of truth: `supabase/migrations/0027-*.sql` (program
content) + `supabase/seed.sql` (journey records).

Resolvers:
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

## 5. Goals, action plans, streaks

The user picks a primary goal during onboarding (step 4 of 5).
The action plan generator (`src/lib/action-plans/suggest.ts`)
turns that goal into a 12-week plan: 12 weekly themes, each
with 3-5 concrete actions.

Streaks (`src/lib/progress/activity.ts`):
- A day counts toward the streak if the user has any of:
  completed a journey day action, sent a chat message to the
  mentor, or completed an assessment.
- One streak per user, anchored on the user's local timezone
  (resolved from `profiles.timezone`, fallback to `UTC`).

Next-action (`src/lib/recommendations/next-action.ts`) returns a
single concrete action the user can take right now, with a short
reason. This is what `/dashboard` shows in the primary card.

## 6. Memory

VAM's memory system is deliberately simple and auditable:

- **Write path** (`src/lib/memory/extraction.ts`): after every
  mentor reply, the chat persistence layer also calls the
  extractor with the user's last message + the mentor's reply.
  The extractor returns 0-3 short, dated, category-tagged
  memory entries, which are inserted into `memories`.
- **Read path** (`src/lib/memory/retrieval.ts`): before every
  chat completion, the system embeds (in a future Stage 7) or
  lexically scores the user's last message against their
  `memories` table, returns the top 12, and feeds them into the
  prompt. Today, ranking is lexical + recency-weighted.
- **Consolidation** (`src/lib/memory/consolidation.ts`): the
  spec'd cron that runs nightly, merges near-duplicates, drops
  stale entries, and re-scores. **This is not yet wired to
  `vercel.json`** (see
  [`CURRENT-STATE-AUDIT.md`](./CURRENT-STATE-AUDIT.md) section
  5 and [`ROADMAP.md`](./ROADMAP.md) section 4).

Memory is scoped to the user by RLS. Memories are surfaced back
to the user in `/insights` and in the settings export.

---

## 7. Voice

Voice is the primary input/output surface for VAM on mobile. The
end-user experience is a single toggle on `/mentor` that switches
the mentor between text and voice. The wiring is split across
three pieces:

- **STT** (`/api/voice/stt`): the browser captures audio via
  MediaRecorder, posts a `Blob` to the route, the route calls
  Groq Whisper (`GROQ_MODEL_STT`), and returns the transcript.
- **VAD** (`src/lib/voice/vad.ts`): a small browser utility that
  watches the input level and emits a `speech-end` event so the
  client knows when to flush and post the recording. This is
  intentionally not a full VAD (we use simple RMS thresholding
  today) — a more sophisticated VAD is in the backlog.
- **TTS** (`/api/voice/tts` + `src/lib/voice/tts-playback-queue.ts`):
  the mentor reply is chunked by sentence
  (`src/lib/voice/sentence-chunker.ts`), each chunk is sent to
  Groq PlayAI (`GROQ_MODEL_TTS`) in order, and the resulting
  audio is queued for sequential playback. The queue smooths
  out TTS latency so the user hears continuous speech instead of
  one long pause per chunk.

Voice sessions are persisted in `voice_sessions` for auditing
and to enable future analysis.

## 8. System architecture

### 8.1 Layers

```
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
|  - mentor/  memory/  voice/  groq/  legal/            |
|  - assessments/  action-plans/  recommendations/      |
|  - progress/  analytics/  theme/  avatar/             |
+-------------------------------------------------------+
                          |
                          v
+-------------------------------------------------------+
|  Supabase (Postgres + Auth + Storage + RLS)           |
|  - 27 forward-only migrations                         |
|  - Service role key isolated to server-only paths     |
|  - All user data behind RLS policies                  |
+-------------------------------------------------------+
                          |
                          v
+-------------------------------------------------------+
|  Groq API (chat, STT, TTS) via raw fetch              |
|  - No SDK; thin client in src/lib/groq/client.ts      |
+-------------------------------------------------------+
```

### 8.2 Supabase clients (the four)

| Client | Where | Cookie adapter | Used by |
| --- | --- | --- | --- |
| Browser | `src/lib/supabase/client.ts` | `document.cookie` | All `"use client"` form components |
| Server (RSC + Route Handlers) | `src/lib/supabase/server.ts` | `next/headers` cookies | Server components + Route Handlers with the user's session |
| Admin (service role) | `src/lib/supabase/admin.ts` | none | The internal purge cron, the collective-intelligence aggregator |
| Middleware | `src/lib/supabase/middleware.ts` | request cookies | `updateSession` only |

ADR-002 codifies the service-role isolation: the admin client is
only ever instantiated inside route handlers that explicitly
require it, and never in user-facing RSCs.

### 8.3 The single auth choke point

Every protected API route uses
`verifyAuthenticatedUser` from `src/lib/supabase/auth-guard.ts`
as its first call. That helper:

1. Calls `supabase.auth.getUser()` (the secure call, not
   `getSession()`).
2. If null, returns `{ user: null, error: 'unauthenticated' }`.
3. If non-null, fetches `profiles.deleted_at` and returns
   `{ user, error: 'soft_deleted' }` if set.

The route handler then either returns 401 or 403, and middleware
short-circuits the redirect to `/account/restore` for soft-deleted
users (see audit section 3.1).

## 9. Environment variables

All env vars are documented in `.env.example`. The complete list:

| Name | Public? | Required? | Used by |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | yes | yes | Supabase clients |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | yes | Supabase clients |
| `SUPABASE_SERVICE_ROLE_KEY` | no | yes (non-dev) | Admin client only |
| `GROQ_API_KEY` | no | yes | All Groq calls |
| `GROQ_MODEL_CHAT` | no | yes | Chat completions |
| `GROQ_MODEL_UTILITY` | no | yes | Memory extraction, next-action |
| `GROQ_MODEL_STT` | no | yes | `/api/voice/stt` |
| `GROQ_MODEL_TTS` | no | yes | `/api/voice/tts` |
| `INTERNAL_CRON_SECRET` | no | yes (non-dev) | `/api/internal/purge-deleted-accounts` |
| `SUPABASE_PROJECT_REF` | no | no | `db:types:linked` (read from `supabase/.temp/project-ref`) |
| `RUN_INTEGRATION` | no | no | Test runner flag to enable the live Supabase integration tests |

Anything prefixed `NEXT_PUBLIC_` is exposed to the browser bundle;
do not put any secret there. The Groq service is the only
third-party data processor; the Supabase service role key is the
only VAM-controlled secret that is never sent to the browser.

## 10. Security model

### 10.1 Authentication

- Email + password (Supabase Auth) and OAuth (Google) are
  supported. Both go through the same
  `/auth/callback` route handler.
- Password recovery uses Supabase's recovery flow; the
  `recovery` link lands the user on `/update-password` (server
  component, `force-dynamic`).
- Session cookies are HttpOnly, SameSite=Lax, Secure in
  production. The SSR cookie adapter in `@supabase/ssr` handles
  this.

### 10.2 Authorization

- **Row-level security** is enabled on every user-data table
  (see `docs/adr/ADR-001-column-level-grants.md`). The service
  role key bypasses RLS and is only used in admin paths.
- **One auth choke point** (`verifyAuthenticatedUser`).
- **Mentor assignment is sticky** (locked in once assigned) so a
  user cannot be silently re-matched to a different persona by a
  race in the rematch API.

### 10.3 Soft delete

- `profiles.deleted_at` set => the user cannot reach any
  protected page (middleware redirect) and cannot use any
  protected API (auth guard 403). They can restore from
  `/account/restore` for 30 days.
- The 30-day window is enforced by a Vercel cron
  (`vercel.json` -> `/api/internal/purge-deleted-accounts`).
- The cron endpoint is authenticated by
  `INTERNAL_CRON_SECRET` (Bearer header) using
  `timingSafeEqual`.

### 10.4 Data export and deletion

- `/api/export` returns a JSON document with the user's
  profile, persona, mentor assignment, all journeys, all
  assessments, all action plans, all memory entries, all
  voice sessions, all legal acceptances, and all consent
  records. This is the GDPR / CCPA user-data export.
- Soft delete (above) + the 30-day hard delete satisfy
  right-to-erasure.

### 10.5 Legal acceptance

- 12 documents, versioned in `legal_documents` with a
  `version` column. On every legal-version bump, the user
  must re-accept before they can use protected surfaces
  (the `va_legal_current` cookie + the `verifyLegalAcceptance`
  guard).
- Acceptance is recorded in `legal_acceptances` with the
  document version + a server timestamp + the user agent +
  the IP (truncated).

### 10.6 Rate limiting and abuse

- Today: none. Acceptable for soft launch.
- Pre-public-marketing (Stage 5): a per-user / per-IP limiter
  on `/api/chat`, `/api/voice/*`, `/api/assessments/submit`.

### 10.7 Observability

- Today: `console.error` in the Groq client and route
  handlers; no centralized log sink.
- Stage 6: Sentry (errors) + Vercel Analytics (request
  latency) + Logflare (server logs).

---

## 11. Delivery model

### 11.1 Environments

- **Local** - developer machines, `supabase start` (Postgres in
  Docker), `.env.local`.
- **Preview** - per-PR Vercel preview deployments, with a shared
  preview Supabase project.
- **Staging** - `main` branch, dedicated Supabase project, mirrors
  production schema. Used for the staging-readiness checklist in
  `docs/STAGING-READINESS.md`.
- **Production** - `release` branch (or whatever the team picks),
  production Supabase project, Groq prod API key.

### 11.2 CI/CD

`.github/workflows/`:

- `ci.yml` - lint + typecheck + unit tests on every PR. Runs
  the `verify-migrations` job against a fresh `supabase start`
  container on every PR that touches `supabase/migrations/`.
- `deploy.yml` - on merge to `main`, runs
  `supabase db push --linked` against the **staging** Supabase
  project, then deploys to the Vercel **staging** environment.
  Production deploys are a manual promotion (see the
  `STAGING-READINESS.md` checklist).

### 11.3 Test layers

| Layer | When | What |
| --- | --- | --- |
| Unit (Vitest) | Every PR | 111 cases across 18 files; pure functions, no I/O |
| Integration (Vitest, `RUN_INTEGRATION=1`) | Nightly, pre-merge to main | 6 cases that boot `supabase start` and exercise RLS, profile trigger, onboarding completion, and legal acceptance |
| Build (Next.js) | Every PR | Catches static-prerender regressions (the one that hit us) |
| Manual staging checklist | Pre-release | The end-to-end checklist in `docs/STAGING-READINESS.md` |

## 12. Architecture decision records (current)

The full list lives in `docs/adr/`. The ones that bind the
current shape:

- **ADR-001 — Column-level grants.** RLS is the primary
  authorization boundary; service role is the only bypass, and
  it is restricted to admin routes. (This is what
  `verifyAuthenticatedUser` exists to enforce.)
- **ADR-002 — Service role isolation.** The admin client is
  never instantiated in a client component or an RSC, only in
  route handlers that have been audited to need it.
- **ADR-003 — Cookie onboarding optimization.** The
  `va_onboarding_done` and `va_legal_current` cookies let
  middleware skip the onboarding / legal re-accept gate on
  every navigation, instead of doing a DB round trip. The DB
  is still the source of truth - the cookies are a cache, and
  a stale cookie leads to a single redirect that re-syncs
  them.
- **ADR-004 — Legal acceptance audit design.** The
  `legal_acceptances` table is append-only and indexed by
  `(user_id, document_id, version)`; a user re-accepting
  never overwrites a prior row.

## 13. Conventions

### 13.1 Code style

- TypeScript strict, no `any` in committed code.
- ESLint config is the Next.js default plus a small
  `eslint-plugin-import` set. `npm run lint` is clean.
- Tailwind utility classes; no inline styles; no CSS modules.
- The `prefers-color-scheme` and a server-resolved `data-theme`
  attribute drive the dark/light theme; personas layer on top
  via a CSS custom property.

### 13.2 File layout

```
src/
  app/                 # Next.js App Router
    (app)/             # Authenticated, gated by middleware
    (auth)/            # Public auth pages, all `force-dynamic`
    account/           # Soft-delete + restore flows
    api/               # Route handlers
    legal/             # Static legal documents
    page.tsx           # Marketing landing
  components/          # Shared UI components
  lib/                 # Domain logic (see section 4.3)
  types/
    database.ts        # Generated Supabase types
middleware.ts          # Edge middleware (auth + soft-delete gate)
supabase/
  migrations/          # Forward-only SQL
  seed.sql             # Reference data
  config.toml          # Supabase CLI config
tests/                 # Vitest, mirror the source layout
scripts/               # Build / dev helpers (db-types, etc.)
docs/                  # This file and friends
```

### 13.3 Naming

- DB: snake_case, plural table names, singular column names
  (`profiles.full_name`, not `profile.fullName`).
- TS: `camelCase` for variables, `PascalCase` for components
  and types.
- File names: `kebab-case.ts` for non-component files,
  `PascalCase.tsx` for components.

### 13.4 Commit and PR conventions

- One commit per logical change. The current audit
  change is a single commit.
- PRs must:
  - pass `npm run typecheck`, `npm run lint`, `npm test`,
    `npm run build` in CI,
  - include a migration in `supabase/migrations/` if they
    touch the schema,
  - include or update a Vitest case if they touch a
    behavior in `src/lib/` or `src/app/api/`,
  - link a stage from `ROADMAP.md` if they implement a
    stage deliverable.

## 14. What this document does NOT cover

- Per-mentor deep prompts - see `src/lib/groq/prompts.ts`.
- The assessment question bank - see
  `supabase/seed.sql` and `src/lib/assessments/scoring.ts`.
- The 30-day program content itself - see
  `supabase/migrations/0027-*.sql`.
- The legal text - see the 12 `legal/*/page.tsx` files.
