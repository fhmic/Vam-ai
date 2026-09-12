-- 0015_goals_progress.sql
-- Stage 2.6 — Progress Tracking.
--
-- Assessments (from the original blueprint's Growth phase) are not part
-- of Stage 2 — see docs/STAGE-2-NOTES.md. Progress in Stage 2 is derived
-- from conversation activity (session/message counts, streaks), not
-- assessment scores, since no assessment engine exists yet. The schema
-- is shaped so assessment-sourced snapshots can be added later without
-- a migration change: `source` already distinguishes where a snapshot
-- came from.

create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'active' check (status in ('active', 'paused', 'completed', 'abandoned')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists goals_user_idx on public.goals (user_id, status);

alter table public.goals enable row level security;

create trigger set_goals_updated_at
  before update on public.goals
  for each row
  execute function public.set_updated_at();

create policy "goals_select_own"
  on public.goals
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "goals_insert_own"
  on public.goals
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "goals_update_own"
  on public.goals
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Goals are simple, low-risk, user-authored content (a title/description
-- the user sets for themselves), unlike messages/memory/assignments —
-- client-direct insert/update is appropriate here. No delete policy:
-- a goal is abandoned via status, not removed, to keep progress history
-- coherent.

create table if not exists public.progress_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  goal_id uuid references public.goals(id) on delete set null,
  source text not null check (source in ('activity', 'assessment')),
  metric_key text not null,
  metric_value numeric not null,
  recorded_at timestamptz not null default now()
);

create index if not exists progress_snapshots_user_metric_idx
  on public.progress_snapshots (user_id, metric_key, recorded_at desc);

alter table public.progress_snapshots enable row level security;

create policy "progress_snapshots_select_own"
  on public.progress_snapshots
  for select
  to authenticated
  using (auth.uid() = user_id);

-- No insert/update/delete policy for `authenticated`: snapshots are
-- computed and written server-side (admin client) after each chat
-- session, not self-reported by the client — a user's own progress
-- metrics shouldn't be directly editable by that same user.
