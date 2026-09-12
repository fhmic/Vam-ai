# VA — Phase 1 Technical Blueprint (historical design baseline)

> **Superseded for current planning by**
> [`../PRODUCT-BLUEPRINT.md`](../PRODUCT-BLUEPRINT.md). This document remains
> valuable as the original Phase 1 design rationale, but statements about what
> is or is not implemented reflect its original planning date.
**Prepared as:** CTO / Senior UX Designer / Solution Architect / Product Manager / Senior Full-Stack Engineer
**Stack:** Next.js · React · TypeScript · TailwindCSS · Supabase · Groq · Vercel · GitHub
**Scope:** Phase 1 (MVP) — architecture and specification only, no implementation code

---

## 1. MVP Definition

### 1.1 What VA Is
VA is an AI mentor/coaching SaaS product. A user talks to (or types with) an AI mentor that remembers them across sessions and devices, tracks their growth over time, adapts to how they personally communicate ("Communication DNA"), and periodically assesses their progress against goals.

### 1.2 Phase 1 Goal
Ship a **single-mentor, single-user-persona** product that proves the core loop:

```
Sign up → Onboarding assessment → Talk to mentor (text + voice)
→ Mentor remembers & adapts → Progress is tracked → User returns (any device)
```

### 1.3 In Scope (Phase 1)
- Email/OAuth authentication, single workspace per user
- One configurable AI mentor persona (system-prompt driven, Groq-hosted LLM)
- Text chat with streaming responses
- Voice input (speech-to-text) and voice output (text-to-speech) — "walkie-talkie" mode, not full real-time duplex
- Mentor Memory: durable, structured long-term memory per user, injected into context
- Communication DNA: a derived profile of tone/style/preferences that tunes mentor responses
- Initial + periodic Assessments (structured questionnaires + LLM-scored open responses)
- Progress Tracking dashboard (goals, streaks, assessment trend lines)
- Multi-device sync (all state lives in Supabase, no local-only state)
- Basic account settings, data export, account deletion (compliance baseline)

### 1.4 Out of Scope (explicitly deferred)
- Multiple mentor personas / mentor marketplace
- Real-time bidirectional voice (low-latency duplex streaming, interruption handling)
- Group/team mentoring, multi-tenant orgs
- Payments/billing (Phase 1 ships free or single static plan flag only)
- Native mobile apps (Phase 1 is responsive web only, installable as PWA)
- Third-party integrations (calendar, Slack, etc.)
- Fine-tuned/custom models — Phase 1 uses Groq-hosted open models via prompting only

### 1.5 Success Criteria
- A returning user on a new device sees identical mentor memory and history within <2s
- Voice round-trip (speak → mentor speaks back) under ~3.5s p50 on Groq
- Assessment → Communication DNA → visibly different mentor tone, verifiable in a QA script
- Zero data loss / no client-only source of truth — Supabase is the single source of truth

---

## 2. Product Architecture

### 2.1 High-Level System Diagram (logical)

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT (Browser / PWA)                    │
│  Next.js App Router (React 18+, TS, Tailwind)                     │
│  - Auth UI      - Chat UI (text+voice)   - Progress Dashboard      │
│  - Assessment UI - Settings              - Realtime subscriptions │
└───────────────┬─────────────────────────────────┬─────────────────┘
                │ HTTPS (Next.js Route Handlers)   │ Supabase JS SDK
                ▼                                  ▼
┌───────────────────────────────┐   ┌───────────────────────────────┐
│  Next.js Server (Vercel)      │   │        Supabase Platform       │
│  - /api/chat (stream proxy)  │   │  - Postgres (RLS)               │
│  - /api/voice/stt            │   │  - Auth (GoTrue)                │
│  - /api/voice/tts            │   │  - Storage (voice, exports)     │
│  - /api/assessment/score     │   │  - Realtime (sync)               │
│  - /api/memory/*  (server-   │   │  - Edge Functions (server logic  │
│    only orchestration)       │◄──┤    that must not run client-side│
└───────────────┬───────────────┘   └───────────────────────────────┘
                │ HTTPS
                ▼
┌───────────────────────────────┐
│           Groq API             │
│  - Chat completion (LLM)       │
│  - Whisper (STT, if via Groq)  │
└───────────────────────────────┘
```

### 2.2 Architectural Principles
1. **Supabase is the single source of truth.** No state lives only in the browser (aside from ephemeral UI state). This is what makes multi-device sync trivial rather than an add-on.
2. **Groq is stateless from VA's point of view.** VA never relies on Groq to "remember" anything — memory is assembled server-side from Supabase and injected into every prompt. This keeps mentor behavior portable across model changes.
3. **Server-side orchestration for anything involving secrets or scoring logic.** The Groq API key never touches the client. All memory-read → prompt-assembly → Groq-call → memory-write cycles happen in Next.js Route Handlers (or Supabase Edge Functions), never client-side.
4. **Row Level Security (RLS) everywhere.** Every table with user data enforces RLS; the client is allowed to talk to Supabase directly for reads/writes that RLS makes safe (chat history, progress), reducing custom API surface.
5. **Streaming-first UX.** Chat responses stream token-by-token; voice output can start playing before generation fully completes (chunked TTS) in a later iteration, but Phase 1 allows full-utterance TTS for simplicity.
6. **Composable memory, not one blob.** Mentor Memory is structured into typed rows (facts, goals, preferences, episodic summaries) rather than a single freeform text field, so it can be selectively retrieved, ranked, and pruned as it grows.

### 2.3 Core Domains (Bounded Contexts)
| Domain | Responsibility |
|---|---|
| **Identity** | Auth, sessions, profile |
| **Conversation** | Chat sessions, messages, streaming, voice I/O |
| **Memory** | Long-term structured mentor memory, retrieval & summarization |
| **Communication DNA** | Derived communication-style profile, updated from assessments + conversation signals |
| **Assessment** | Onboarding + periodic structured/open assessments, scoring |
| **Progress** | Goals, milestones, metrics, trend data derived from assessments + activity |
| **Sync/Realtime** | Cross-device consistency via Supabase Realtime |

---

## 3. Information Architecture

### 3.1 Top-Level Navigation (authenticated app shell)
```
/dashboard        → Progress overview (home)
/mentor           → Chat (text + voice) — primary surface
/assessments      → List + take assessments, view results
/progress         → Detailed goals, metrics, trend charts
/settings
  /settings/profile
  /settings/communication-dna   (view/edit derived profile)
  /settings/data                (export, delete account)
  /settings/devices              (active sessions, optional Phase 1.1)
/auth
  /auth/sign-in
  /auth/sign-up
  /auth/reset-password
  /auth/callback                (OAuth/email confirm redirect)
```

### 3.2 Content Model Overview
- **Mentor** (singleton in Phase 1, table exists for future multi-mentor)
- **Conversation Session** → **Messages** (text/voice, role: user/mentor/system)
- **Memory Item** (typed: fact / preference / goal-reference / episodic-summary)
- **Communication DNA Profile** (one row per user, versioned)
- **Assessment Template** → **Assessment Response** → **Assessment Score**
- **Goal** → **Progress Snapshot** (time-series)

### 3.3 Sitemap Hierarchy (UX grouping)
```
Home (Dashboard)
├─ Talk to Mentor
│   ├─ Text mode
│   └─ Voice mode
├─ Assessments
│   ├─ Onboarding Assessment (forced first-run)
│   └─ Periodic Check-ins
├─ My Progress
│   ├─ Goals
│   └─ Trends (assessment scores over time)
└─ Settings
    ├─ Profile
    ├─ Communication DNA
    ├─ Data & Privacy
    └─ Sign out
```

---

## 4. User Flows

### 4.1 Sign-Up & Onboarding (first-run, critical path)
```
1. Landing → Sign up (email+password or OAuth)
2. Supabase Auth creates auth.users row
3. DB trigger creates public.profiles row (1:1)
4. Redirect → Forced Onboarding Assessment (cannot skip to /mentor)
5. Assessment submitted → /api/assessment/score (Groq scores open-ended answers)
6. Score + answers → derive initial Communication DNA profile (v1)
7. Initial Memory Items seeded (goals stated during onboarding become goal-type memory)
8. Redirect → /mentor with a mentor-authored welcome message referencing the assessment
```

### 4.2 Returning User — Any Device
```
1. Open app → Supabase session restored (or sign in)
2. /dashboard loads: progress summary, streak, next check-in due date
3. Realtime subscription attaches to conversation + memory channels
4. If another device sends a message concurrently, this device sees it live
```

### 4.3 Core Chat Loop (Text)
```
1. User opens/continues a Conversation Session
2. User sends message → optimistic UI insert → row written to messages table (client, RLS-checked)
3. Client calls /api/chat with {sessionId, message}
4. Server: 
   a. loads recent messages (short-term context)
   b. retrieves relevant Memory Items (ranked)
   c. loads Communication DNA profile
   d. assembles system prompt (mentor persona + DNA + memory + goals)
   e. streams Groq completion back to client (SSE)
   f. on completion: persists mentor message; triggers async memory-extraction job
5. Client renders streamed tokens; message finalized in DB (Realtime keeps other devices in sync)
```

### 4.4 Core Chat Loop (Voice)
```
1. User taps mic → records audio (MediaRecorder)
2. On stop: audio blob uploaded to Supabase Storage (temp bucket) OR sent directly to /api/voice/stt
3. /api/voice/stt → Groq Whisper transcription → text
4. Text flows into the same pipeline as 4.3 (steps 2–5)
5. Mentor's text response → /api/voice/tts → audio stream/back → client autoplays
6. Transcript + audio reference stored on the message row for replay
```

### 4.5 Assessment Flow (periodic)
```
1. System determines a check-in is due (time-based rule, evaluated on dashboard load)
2. User prompted → takes structured (Likert/multiple-choice) + 1-3 open questions
3. Submit → /api/assessment/score:
   a. structured answers scored deterministically
   b. open answers scored/interpreted via Groq (rubric-based prompt)
4. Assessment Score row written; Progress Snapshot row written
5. Communication DNA profile re-derived (new version) if signal strength passes threshold
6. Dashboard/trend charts update via Realtime
```

### 4.6 Multi-Device Conflict Handling
- All writes are append-only or last-write-wins on narrow fields (e.g., profile display name).
- Conversation messages are immutable once written — no edit conflicts possible.
- Memory Items are versioned (superseded_by pointer) rather than mutated in place, so concurrent extraction jobs never lose data.

---

## 5. Database Schema

> Postgres, hosted on Supabase. All tables use `uuid` PKs (`gen_random_uuid()`), `timestamptz` for time, and RLS enabled by default. This is schema design, not application code.

### 5.1 Identity & Profile
```sql
-- profiles: 1:1 with auth.users
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  timezone text default 'UTC',
  onboarding_completed_at timestamptz,
  plan text default 'free',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

### 5.2 Mentors (singleton-ready for future multi-mentor)
```sql
create table public.mentors (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,             -- 'default-mentor'
  display_name text not null,
  persona_prompt text not null,          -- base system prompt
  voice_id text,                         -- TTS voice reference
  is_active boolean default true,
  created_at timestamptz default now()
);
```

### 5.3 Conversation
```sql
create table public.conversation_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  mentor_id uuid not null references public.mentors(id),
  title text,
  started_at timestamptz default now(),
  last_message_at timestamptz default now()
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.conversation_sessions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('user','mentor','system')),
  content text not null,
  input_mode text not null default 'text' check (input_mode in ('text','voice')),
  audio_url text,                        -- Supabase Storage path, nullable
  transcript_confidence numeric,
  created_at timestamptz default now()
);
create index on public.messages (session_id, created_at);
```

### 5.4 Mentor Memory
```sql
create table public.memory_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('fact','preference','goal_reference','episodic_summary')),
  content text not null,                 -- normalized natural-language statement
  source_message_id uuid references public.messages(id),
  importance numeric default 0.5,        -- 0..1, used for retrieval ranking
  embedding vector(1536),                -- pgvector, for semantic retrieval
  superseded_by uuid references public.memory_items(id),
  created_at timestamptz default now()
);
create index on public.memory_items (user_id, type);
-- ivfflat/hnsw index on embedding created after pgvector extension enabled
```

### 5.5 Communication DNA
```sql
create table public.communication_dna_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  version int not null default 1,
  tone text,                             -- e.g. 'direct', 'encouraging', 'analytical'
  preferred_length text,                 -- 'concise' | 'detailed'
  motivational_style text,               -- 'challenge' | 'support' | 'accountability'
  vocabulary_notes text,
  raw_profile jsonb not null,            -- full structured profile, extensible
  derived_from text not null,            -- 'onboarding' | 'assessment' | 'conversation_signal'
  created_at timestamptz default now()
);
create index on public.communication_dna_profiles (user_id, version desc);
```

### 5.6 Assessments
```sql
create table public.assessment_templates (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,             -- 'onboarding-v1'
  title text not null,
  schema jsonb not null,                 -- question definitions
  is_active boolean default true
);

create table public.assessment_responses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  template_id uuid not null references public.assessment_templates(id),
  answers jsonb not null,                -- raw submitted answers
  submitted_at timestamptz default now()
);

create table public.assessment_scores (
  id uuid primary key default gen_random_uuid(),
  response_id uuid not null references public.assessment_responses(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  scores jsonb not null,                 -- structured, dimension: score
  narrative_summary text,                -- LLM-generated summary
  created_at timestamptz default now()
);
```

### 5.7 Progress
```sql
create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  status text default 'active' check (status in ('active','paused','completed','abandoned')),
  created_at timestamptz default now()
);

create table public.progress_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  goal_id uuid references public.goals(id),
  source text not null,                  -- 'assessment' | 'activity'
  metric_key text not null,              -- e.g. 'confidence_score'
  metric_value numeric not null,
  recorded_at timestamptz default now()
);
create index on public.progress_snapshots (user_id, metric_key, recorded_at);
```

### 5.8 ERD (textual)
```
profiles 1───* conversation_sessions 1───* messages
profiles 1───* memory_items
profiles 1───* communication_dna_profiles
profiles 1───* assessment_responses 1───1 assessment_scores
profiles 1───* goals 1───* progress_snapshots
mentors  1───* conversation_sessions
assessment_templates 1───* assessment_responses
```

---

## 6. Supabase Architecture

### 6.1 Services Used
| Supabase Service | Purpose in VA |
|---|---|
| **Auth (GoTrue)** | Email/password + OAuth (Google), session/JWT issuance |
| **Postgres + RLS** | System of record for all domains in Section 5 |
| **pgvector extension** | Semantic memory retrieval (embedding similarity) |
| **Realtime** | Live sync of messages, memory updates, progress snapshots across devices |
| **Storage** | Voice recordings (`voice-notes` bucket), data export files (`exports` bucket) |
| **Edge Functions** | Server-only logic that shouldn't live in Next.js (memory extraction cron, scheduled check-in evaluation) — used where Vercel cron + route handlers aren't the natural fit, or where DB-adjacent triggers are cheaper |
| **Database Webhooks / pg_cron** | Trigger memory-extraction job after N new messages; trigger check-in due evaluation nightly |

### 6.2 Storage Buckets
```
voice-notes/{user_id}/{message_id}.webm     (private, RLS via signed URLs)
exports/{user_id}/{export_id}.json          (private, short-lived signed URL)
avatars/{user_id}.png                       (public-read, owner-write)
```

### 6.3 Realtime Channels
- `conversation:{session_id}` — new messages, streaming completion markers
- `memory:{user_id}` — memory item created/superseded (drives "mentor is learning about you" UI signal)
- `progress:{user_id}` — new snapshot inserted (drives live trend chart updates)

### 6.4 Background Jobs (Postgres functions + pg_cron, or Edge Functions)
| Job | Trigger | Action |
|---|---|---|
| `extract_memory` | After every 4-6 messages in a session (DB trigger → queue) | Calls Groq via Edge Function to extract candidate memory items, writes to `memory_items` |
| `evaluate_checkins_due` | Nightly cron | Flags users whose next assessment is due, sets a `checkins.due` flag read by dashboard |
| `recompute_dna_if_stale` | After assessment_scores insert | Re-derives Communication DNA if enough new signal accumulated |
| `prune_low_importance_memory` | Weekly cron | Soft-archives low-importance, old, superseded memory items to control context size |

### 6.5 Why Postgres (not a separate memory DB)
Using Postgres + pgvector for both relational and vector data in Phase 1 avoids a second infrastructure dependency, keeps RLS uniform, and is sufficient at MVP scale (semantic recall over a few hundred memory items per user is fast with an HNSW index).

---

## 7. Authentication Architecture

### 7.1 Providers (Phase 1)
- Email + password (Supabase Auth, email confirmation required)
- Google OAuth (fastest sign-up path, reduces friction)

### 7.2 Session Model
- Supabase issues JWT (access token, short-lived) + refresh token (httpOnly cookie via `@supabase/ssr`)
- Next.js middleware refreshes session on every request, keeps server components aware of auth state
- Client SDK auto-refreshes; Realtime connections re-authenticate on token refresh

### 7.3 Server vs Client Auth Boundary
- **Server Components / Route Handlers:** use a server Supabase client bound to the request's cookies — used for anything touching Groq or performing privileged writes (memory extraction, scoring).
- **Client Components:** use a browser Supabase client for direct RLS-protected reads/writes (loading chat history, subscribing to Realtime) — no privileged logic here.

### 7.4 Route Protection
```
Public:      /, /auth/*
Protected:   /dashboard, /mentor, /assessments, /progress, /settings/*
Onboarding-gated: all protected routes redirect to onboarding assessment
                  if profiles.onboarding_completed_at is null
```
Enforced in Next.js middleware (redirect based on session + profile flag) — never trust client-side route guards alone.

### 7.5 RLS Policy Pattern (applied per table)
```sql
alter table public.messages enable row level security;

create policy "users can read own messages"
  on public.messages for select
  using (auth.uid() = user_id);

create policy "users can insert own messages"
  on public.messages for insert
  with check (auth.uid() = user_id);
```
Same pattern (owner-scoped select/insert, no update/delete on immutable tables like `messages`) applied across `memory_items`, `communication_dna_profiles`, `assessment_responses`, `assessment_scores`, `goals`, `progress_snapshots`. Privileged tables (`mentors`, `assessment_templates`) are read-only to authenticated users and writable only via service role (admin/back-office, out of Phase 1 UI scope).

---

## 8. Groq Integration Architecture

### 8.1 Usage Surfaces
| Use Case | Groq Capability |
|---|---|
| Mentor chat completion | Chat/completions endpoint, streaming |
| Speech-to-text | Whisper-large-v3 (or current Groq-hosted STT model) |
| Assessment open-answer scoring | Chat/completions, structured JSON output mode |
| Memory extraction | Chat/completions, structured JSON output mode |
| Communication DNA derivation | Chat/completions, structured JSON output mode |

### 8.2 Server-Only Access Pattern
All Groq calls happen in Next.js Route Handlers (Node runtime) or Supabase Edge Functions. `GROQ_API_KEY` is stored only in Vercel/Supabase server environment variables — never exposed via `NEXT_PUBLIC_*`.

### 8.3 Prompt Assembly Pipeline (Chat)
```
1. System prompt = mentor.persona_prompt
                 + Communication DNA directives (tone, length, motivational style)
                 + top-K relevant Memory Items (ranked: importance × recency × embedding similarity to current message)
                 + active goals summary
2. Short-term context = last N messages in current session (token-budgeted)
3. User message = latest input (from text or STT)
4. Call Groq chat completion with (system, short-term context, user message), stream=true
5. Stream tokens to client via SSE / ReadableStream
6. On stream end: persist full mentor message; enqueue async memory-extraction
```

### 8.4 Structured Output Contracts
Memory extraction, DNA derivation, and assessment scoring all request **strict JSON** from Groq (JSON mode / schema-constrained prompting) to keep downstream parsing reliable, e.g.:
```
MemoryExtractionResult {
  items: [{ type, content, importance }]
}
CommunicationDnaResult {
  tone, preferred_length, motivational_style, vocabulary_notes, raw_profile
}
AssessmentScoreResult {
  scores: { [dimension]: number },
  narrative_summary: string
}
```

### 8.5 Model Selection Strategy
- Chat/mentor: a larger Groq-hosted instruction model (quality-prioritized, still low-latency on Groq hardware)
- Extraction/scoring/DNA (structured, non-conversational): a smaller/faster Groq-hosted model, since these are internal utility calls, not user-facing latency
- Model identifiers kept in environment config (`GROQ_MODEL_CHAT`, `GROQ_MODEL_UTILITY`) — never hardcoded, so they can be swapped without redeploying logic

### 8.6 Resilience
- Timeouts + single retry with backoff on Groq calls
- Circuit breaker: if Groq errors repeatedly, mentor chat surfaces a graceful "mentor is temporarily unavailable" state rather than a hard failure, and never fails a whole request in a way that loses the user's already-persisted message
- Rate limit handling: queue/backoff for background jobs (extraction, DNA) so they never block the interactive chat path

---

## 9. Voice Architecture

### 9.1 Phase 1 Voice Model: "Push-to-Talk" (not full duplex)
Chosen deliberately for MVP: lower complexity, no interruption/turn-taking logic needed, still feels conversational.

```
User holds/taps mic button
  → MediaRecorder captures audio (webm/opus)
  → On release: blob sent to /api/voice/stt
  → Groq Whisper → transcript
  → Transcript enters normal chat pipeline (Section 8.3)
  → Mentor text response generated
  → /api/voice/tts converts response to audio
  → Client auto-plays audio; waveform/visual indicator during playback
```

### 9.2 Text-to-Speech
- TTS provider abstracted behind a `VoiceProvider` interface (architecture-level, not code) so the underlying vendor can change without touching call sites.
- Phase 1 default: Groq-hosted or a compatible low-latency TTS API called from `/api/voice/tts`; audio streamed back to client where feasible, otherwise full-file response.
- Mentor's `voice_id` (Section 5.2) selects the voice; stored per mentor so future multi-mentor supports distinct voices.

### 9.3 Client-Side Voice UX States
```
idle → recording → transcribing → thinking (mentor generating) → speaking → idle
```
Each state has explicit UI affordance (mic icon states, waveform, "mentor is thinking" indicator) — no silent dead-air states.

### 9.4 Storage & Replay
- Raw audio stored in `voice-notes` bucket, referenced by `messages.audio_url`
- Transcript always stored as `messages.content` (text) regardless of input mode, so history/search/memory-extraction work uniformly over text
- User can replay their own voice notes and mentor's spoken responses from chat history

### 9.5 Accessibility & Fallback
- Voice mode is additive, never required — every flow has a full text-only path
- Automatic fallback to text-only if microphone permission denied or STT fails twice in a row, with a clear inline message

### 9.6 Deferred to Later Phases
- Real-time streaming duplex voice (WebRTC, barge-in/interruption)
- On-device VAD (voice activity detection) for hands-free continuous conversation
- Multi-language voice support beyond initial launch language

---

## 10. GitHub Repository Structure

### 10.1 Repository Strategy
Single monorepo, single Next.js app (no need for a monorepo tool like Turborepo at Phase 1 scale — kept as a plain repo to reduce operational overhead, structured so it *can* be split later).

```
va/
├─ .github/
│  └─ workflows/
│     ├─ ci.yml                 # lint, typecheck, test on PR
│     └─ preview-comment.yml    # Vercel preview link comment (optional, Vercel does this natively)
├─ .vscode/
│  └─ settings.json
├─ docs/
│  ├─ blueprint/                # this document and future architecture docs
│  └─ adr/                      # architecture decision records
├─ prisma/  (only if Prisma is chosen for typed schema mgmt — optional, see 10.4)
├─ supabase/
│  ├─ migrations/                # SQL migration files (source of truth for schema)
│  ├─ seed.sql
│  ├─ functions/                 # Edge Functions (memory extraction, DNA recompute, cron handlers)
│  └─ config.toml
├─ public/
│  └─ (static assets, icons, manifest.json for PWA)
├─ src/
│  ├─ app/                       # Next.js App Router (Section 11)
│  ├─ components/
│  ├─ lib/
│  ├─ hooks/
│  ├─ types/
│  └─ styles/
├─ .env.example
├─ .eslintrc.cjs
├─ .prettierrc
├─ next.config.ts
├─ tailwind.config.ts
├─ tsconfig.json
├─ package.json
└─ README.md
```

### 10.2 Branching Strategy
- `main` — always deployable, protected, maps to Vercel Production
- `develop` (optional at this size; Phase 1 may go trunk-based directly off `main` with feature branches)
- `feat/*`, `fix/*` — feature branches, PR into `main`, Vercel auto-generates preview deployments per PR

### 10.3 CI Gate (GitHub Actions → required before merge)
```
1. Install deps (cached)
2. Lint (eslint)
3. Typecheck (tsc --noEmit)
4. Unit tests (vitest/jest)
5. Build (next build) — catches build-time errors before merge
```

### 10.4 Schema Source of Truth
Supabase CLI migrations (`supabase/migrations/*.sql`) are the single source of truth for schema — applied via `supabase db push` in CI/CD to keep environments (local, preview, staging, prod) consistent. Prisma is optional and only for typed query convenience; if adopted, its schema is generated *from* the Supabase migrations, not the other way around, to avoid two competing sources of truth.

---

## 11. Next.js Folder Structure

### 11.1 App Router Layout
```
src/app/
├─ layout.tsx                       # root layout, providers (theme, auth listener)
├─ page.tsx                         # marketing/landing (public)
├─ globals.css
├─ (auth)/
│  ├─ sign-in/page.tsx
│  ├─ sign-up/page.tsx
│  ├─ reset-password/page.tsx
│  └─ callback/route.ts             # OAuth/email confirm handler
├─ (app)/                           # authenticated app shell, layout enforces auth+onboarding
│  ├─ layout.tsx                    # app shell: nav, session check, onboarding gate
│  ├─ dashboard/page.tsx
│  ├─ mentor/
│  │  ├─ page.tsx                   # chat UI (session list + active chat)
│  │  └─ [sessionId]/page.tsx
│  ├─ assessments/
│  │  ├─ page.tsx                   # list + due indicator
│  │  └─ [templateSlug]/page.tsx    # take assessment
│  ├─ progress/page.tsx
│  └─ settings/
│     ├─ layout.tsx
│     ├─ profile/page.tsx
│     ├─ communication-dna/page.tsx
│     └─ data/page.tsx
├─ api/
│  ├─ chat/route.ts                 # POST, streams Groq completion
│  ├─ voice/
│  │  ├─ stt/route.ts               # POST audio → transcript
│  │  └─ tts/route.ts               # POST text → audio
│  ├─ assessment/
│  │  └─ score/route.ts             # POST answers → scores + DNA trigger
│  ├─ memory/
│  │  └─ extract/route.ts           # internal, called by DB webhook/cron
│  └─ export/
│     └─ route.ts                   # POST → generates data export
└─ not-found.tsx
```

### 11.2 Supporting Directories
```
src/components/
├─ ui/               # design-system primitives (Button, Card, Dialog, etc.)
├─ chat/             # MessageBubble, Composer, VoiceButton, StreamingText
├─ assessment/       # QuestionRenderer, LikertScale, OpenAnswerField
├─ progress/         # TrendChart, GoalCard, StreakBadge
└─ layout/           # NavBar, SideNav, AppShell

src/lib/
├─ supabase/
│  ├─ client.ts           # browser client factory
│  ├─ server.ts           # server/RSC client factory (cookies-bound)
│  └─ middleware.ts        # session refresh helper for Next.js middleware
├─ groq/
│  ├─ client.ts
│  ├─ prompts/             # persona + task prompt templates
│  └─ schemas/             # zod schemas for structured Groq JSON outputs
├─ memory/
│  ├─ retrieval.ts         # ranked memory fetch
│  └─ extraction.ts        # extraction pipeline orchestration (server-only)
├─ dna/
│  └─ derive.ts
└─ validation/             # shared zod schemas (forms, API payloads)

src/hooks/
├─ useAuth.ts
├─ useConversation.ts       # Realtime-subscribed message stream
├─ useVoiceRecorder.ts
└─ useProgress.ts

src/types/
└─ database.ts              # generated from Supabase (supabase gen types typescript)

middleware.ts                 # root: auth/session refresh + route protection
```

### 11.3 Rendering Strategy
- Marketing page: static
- `(app)` routes: server components for initial data (progress, session list), client components for interactive chat/voice
- Streaming responses via Route Handlers using `ReadableStream` / SSE, consumed client-side with `EventSource`-style incremental parsing

---

## 12. API Design

> All routes below are Next.js Route Handlers unless noted. All require an authenticated session (validated via server Supabase client) except `/api/health`.

### 12.1 Chat
```
POST /api/chat
Body:   { sessionId: string, message: string, inputMode: 'text'|'voice' }
Resp:   text/event-stream — sequence of { delta: string } chunks, terminated by { done: true, messageId }
Errors: 401 unauthenticated, 404 session not found/not owned, 429 upstream rate limited, 502 Groq failure
```

### 12.2 Voice
```
POST /api/voice/stt
Body:   multipart/form-data { audio: Blob, sessionId: string }
Resp:   { transcript: string, confidence: number }

POST /api/voice/tts
Body:   { text: string, voiceId?: string }
Resp:   audio/mpeg (binary stream) or { audioUrl: string } if pre-uploaded to Storage
```

### 12.3 Assessments
```
GET  /api/assessment/templates            → active templates + due status for current user
POST /api/assessment/score
Body:   { templateId: string, answers: Record<string, unknown> }
Resp:   { responseId, scores, narrativeSummary }
Side effects: writes assessment_scores, progress_snapshots; may enqueue DNA recompute
```

### 12.4 Memory (internal-only surface, not called from client UI directly)
```
POST /api/memory/extract      (invoked by Supabase DB webhook / cron, service-role auth)
Body: { sessionId: string }
Resp: { itemsCreated: number }
```

### 12.5 Data & Account
```
POST /api/export
Resp:   { exportUrl: string }   (signed URL to Storage object, short TTL)

POST /api/account/delete
Resp:   { status: 'scheduled' }  (soft-delete window before hard delete, GDPR-style grace period)
```

### 12.6 Direct-to-Supabase Reads (no custom API needed)
The client talks directly to Supabase (via RLS-protected queries + Realtime subscriptions) for:
- Loading conversation session list & message history
- Subscribing to live message/memory/progress updates
- Reading goals, progress_snapshots, communication_dna_profiles
- Reading own profile

This deliberately minimizes custom backend surface area — custom API routes exist only where a secret (Groq key) or privileged cross-cutting logic is required.

### 12.7 Error Contract (all custom routes)
```
{ error: { code: string, message: string } }
```
Standard codes: `UNAUTHENTICATED`, `NOT_FOUND`, `VALIDATION_ERROR`, `UPSTREAM_ERROR`, `RATE_LIMITED`.

---

## 13. Vercel Deployment Architecture

### 13.1 Environments
| Environment | Trigger | Supabase Project | Purpose |
|---|---|---|---|
| Production | push/merge to `main` | `va-prod` | Live users |
| Preview | every PR | `va-staging` (shared) or ephemeral branch DB via Supabase branching | QA, stakeholder review |
| Local | `next dev` | `va-dev` or local Supabase (via `supabase start`) | Development |

### 13.2 Environment Variables (Vercel Project Settings, scoped per environment)
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY        (server-only, never NEXT_PUBLIC_)
GROQ_API_KEY                      (server-only)
GROQ_MODEL_CHAT
GROQ_MODEL_UTILITY
NEXT_PUBLIC_APP_URL
```

### 13.3 Build & Runtime Configuration
- Framework preset: Next.js (App Router)
- Node runtime for all Route Handlers that call Groq or Supabase service-role (Edge runtime avoided where Node-only SDK features or larger memory/timeouts are needed, e.g., audio handling)
- `vercel.json` used only if custom function region pinning or cron is needed:
```json
{
  "functions": {
    "src/app/api/voice/**/route.ts": { "maxDuration": 30 }
  },
  "crons": [
    { "path": "/api/internal/checkins-due", "schedule": "0 6 * * *" }
  ]
}
```
(Cron target route is protected by a shared secret header, not user auth.)

### 13.4 Deployment Flow
```
Dev pushes branch → GitHub Actions CI runs (Section 10.3) → Vercel builds Preview
PR approved + CI green → merge to main → Vercel builds Production
Post-deploy: Supabase migrations applied via CI step (`supabase db push --linked`) before/alongside the app deploy, gated so app never runs against an un-migrated schema
```

### 13.5 Observability
- Vercel: built-in function logs, Web Analytics (Core Web Vitals)
- Supabase: built-in Postgres logs, Auth logs
- Application-level: structured JSON logging in Route Handlers (request id, user id hash, latency, upstream status) shipped to Vercel log drains → external log sink (e.g., Logtail/Axiom) for retention beyond Vercel defaults — provider chosen at implementation time, kept swappable via a thin logger interface.

---

## 14. Security Model

### 14.1 Principles
- **Least privilege by default:** RLS-first, service-role key used only in trusted server contexts (Route Handlers, Edge Functions, cron targets) and never shipped to the client.
- **Defense in depth:** route protection at middleware layer AND RLS at the database layer — a bug in one does not expose data via the other.
- **No secrets in the client bundle:** enforced by convention (`NEXT_PUBLIC_*` prefix reserved strictly for values safe to expose) and a CI lint step that fails the build if `GROQ_API_KEY` or `SUPABASE_SERVICE_ROLE_KEY` appear referenced outside server-only files.

### 14.2 Data Protection
- All traffic over HTTPS (enforced by Vercel + Supabase)
- Voice recordings and exports stored in **private** Storage buckets, accessed only via short-lived signed URLs
- Sensitive assessment content and memory items are user-scoped via RLS; no admin UI exists in Phase 1 that could bypass this without the service role, and any future admin tooling must go through audited service-role access only

### 14.3 Authentication Hardening
- Email confirmation required before first sign-in completes onboarding
- Password policy enforced by Supabase Auth settings (min length, breach detection if enabled)
- OAuth restricted to a single vetted provider (Google) for Phase 1 to minimize attack surface
- Session refresh handled server-side in middleware; stale/invalid tokens force re-authentication

### 14.4 Application-Layer Protections
- Input validation on every API route via shared `zod` schemas (rejects malformed payloads before they reach Groq or the DB)
- Rate limiting on `/api/chat`, `/api/voice/*`, `/api/assessment/score` per user (e.g., token-bucket keyed by `user_id`, implemented via a lightweight Postgres counter or Upstash Redis if added) to control cost and abuse
- Content moderation pass (lightweight, prompt-based or a dedicated moderation model call) on user-submitted content before it's persisted as long-term memory, to prevent poisoning mentor memory with harmful content
- CSRF is not a concern for the JSON API routes (same-site, token-based auth via Supabase cookies + `SameSite=Lax`), but state-changing routes still verify the session server-side rather than trusting client-supplied identity

### 14.5 Compliance Baseline
- Data export endpoint (Section 12.5) satisfies data-portability expectations
- Account deletion is a soft-delete with a grace period, then hard delete (including Storage objects and vector embeddings) via a scheduled job — no orphaned personal data left behind
- Privacy policy / terms surfaced at sign-up; consent timestamp stored on `profiles`

### 14.6 Threat Model Highlights (Phase 1 specific)
| Threat | Mitigation |
|---|---|
| Client forges another user's `user_id` in a request | Server always derives `user_id` from the authenticated session, never trusts client-supplied `user_id` fields |
| Prompt injection via user chat trying to exfiltrate system prompt / other users' memory | System prompt never echoes raw memory verbatim into a context the model is told to "repeat"; memory retrieval is scoped strictly to `auth.uid()`; output is monitored, not blindly trusted, in scoring/extraction contexts |
| Leaked Groq key | Key stored only in Vercel server env, rotated via Vercel dashboard, never logged |
| Realtime channel eavesdropping | Supabase Realtime respects RLS on the underlying tables; channel names are scoped per-user, and RLS is the actual authorization boundary, not the channel name |
| Malicious audio upload (oversized/invalid) | File size/type validated before STT call; Storage bucket policies cap object size |

---

## Summary

This blueprint defines a Phase 1 MVP for VA that is:
- **Multi-device native** (Supabase as sole source of truth + Realtime sync)
- **Memory-driven** (structured, typed, retrievable Mentor Memory rather than a single context blob)
- **Adaptive** (Communication DNA tunes every mentor response)
- **Measurable** (Assessments + Progress Snapshots create a real trend line, not just chat history)
- **Secure and swappable** (RLS-first, secrets server-only, Groq/TTS providers abstracted behind interfaces)
- **Deployable on day one** (GitHub → CI → Vercel Preview/Production, Supabase migrations as schema source of truth)

**Next step (Phase 1 build):** implementation of Sections 10–13 as actual code, starting with Supabase migrations (Section 5) and auth scaffolding (Section 7), since every other domain depends on them.
