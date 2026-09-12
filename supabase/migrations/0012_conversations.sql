-- 0012_conversations.sql
-- Stage 2.1 — Mentor Domain Model (conversation surfaces).

create table if not exists public.conversation_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  mentor_id uuid not null references public.mentors(id),
  title text,
  started_at timestamptz not null default now(),
  last_message_at timestamptz not null default now()
);

create index if not exists conversation_sessions_user_idx
  on public.conversation_sessions (user_id, last_message_at desc);

alter table public.conversation_sessions enable row level security;

create policy "conversation_sessions_select_own"
  on public.conversation_sessions
  for select
  to authenticated
  using (auth.uid() = user_id);

-- No insert/update/delete policy for `authenticated`: sessions are
-- created by the server (admin client) inside /api/chat, which is what
-- guarantees mentor_id always comes from the matching engine's current
-- assignment rather than a client-supplied value pointing at an
-- arbitrary or inactive mentor. `last_message_at` is bumped the same
-- way alongside each new message.

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.conversation_sessions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('user', 'mentor', 'system')),
  content text not null,
  input_mode text not null default 'text' check (input_mode in ('text', 'voice')),
  audio_path text,                     -- Storage path, set for voice input/output
  created_at timestamptz not null default now()
);

create index if not exists messages_session_idx
  on public.messages (session_id, created_at);

alter table public.messages enable row level security;

create policy "messages_select_own"
  on public.messages
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Messages are written by the server (admin client) inside /api/chat,
-- not directly by the client, so the mentor's reply can never be forged
-- by a client-side insert and message persistence is atomic with the
-- Groq call that produced it. No insert/update/delete policy is granted
-- to `authenticated` — all writes go through the admin client after
-- verifyAuthenticatedUser().
