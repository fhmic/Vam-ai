-- 0013_mentor_assignments.sql
-- Stage 2.2 — Mentor Matching Engine.
--
-- Same append-only audit-trail pattern as legal_acceptances (0007): each
-- time the matching engine (re-)assigns a mentor, it inserts a new row
-- rather than updating an existing one, so "which mentor was active for
-- this user on this date" is always reconstructable. The current mentor
-- for a user is simply the most recent row by assigned_at.

create table if not exists public.user_mentor_assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  mentor_id uuid not null references public.mentors(id),
  reason text not null,                 -- short machine-readable match reason, e.g. 'primary_goal:ace-interviews'
  assigned_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists user_mentor_assignments_user_idx
  on public.user_mentor_assignments (user_id, assigned_at desc);

alter table public.user_mentor_assignments enable row level security;

create policy "user_mentor_assignments_select_own"
  on public.user_mentor_assignments
  for select
  to authenticated
  using (auth.uid() = user_id);

-- No insert/update/delete policy for `authenticated`: assignments are
-- written only by src/lib/mentor/assignment.ts via the admin client, so
-- a user can never assign themselves an arbitrary mentor or forge the
-- match `reason` shown in their own history.
