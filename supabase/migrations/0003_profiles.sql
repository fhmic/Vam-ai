-- 0003_profiles.sql
-- Core identity table. 1:1 with auth.users.
-- Every other domain table (mentor, memory, assessments, progress —
-- added in later phases) references profiles(id), not auth.users(id)
-- directly, so RLS and application code have one stable owner column.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  timezone text not null default 'UTC',
  plan text not null default 'free' check (plan in ('free', 'pro')),
  onboarding_completed_at timestamptz,
  terms_accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is
  'One row per authenticated user. Source of truth for onboarding/plan state.';

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at();
