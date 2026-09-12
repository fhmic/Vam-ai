-- 0019_message_feedback.sql
-- Stage 3.5 — Mentor quality.
--
-- Immutable, one-per-message rating (thumbs up/down) — same
-- append-only-ish pattern as legal_acceptances: a rating is a fact
-- about a point in time, not something to silently overwrite. A user
-- can change their mind (upsert), but the row's existence and message
-- linkage can never be forged for another user's message thanks to the
-- FK + owner-scoped RLS.

create table if not exists public.message_feedback (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  rating smallint not null check (rating in (-1, 1)),
  created_at timestamptz not null default now(),
  unique (message_id, user_id)
);

create index if not exists message_feedback_user_idx on public.message_feedback (user_id);

alter table public.message_feedback enable row level security;

create policy "message_feedback_select_own"
  on public.message_feedback
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "message_feedback_insert_own"
  on public.message_feedback
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "message_feedback_update_own"
  on public.message_feedback
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Rating a message is low-sensitivity, user-authored content — same
-- justification as `goals`/`action_plan_items` for allowing direct
-- client writes rather than routing through an API route.
