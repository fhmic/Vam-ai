-- 0010_user_preferences.sql
-- CTO Review Foundation Hardening — Change #4: User Preferences Table
--
-- One-to-one companion table to profiles for mentor/UX preferences.
-- Kept separate from `profiles` (rather than more columns on profiles)
-- because these are pure client-controllable UX prefs, updated far more
-- often than identity/plan fields, and this keeps the profiles column
-- grant surface (migration 0006/0008) focused on identity data only.

create table if not exists public.user_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  theme text not null default 'system'
    check (theme in ('light', 'dark', 'system')),
  voice_enabled boolean not null default true,
  tts_speed numeric not null default 1.0
    check (tts_speed between 0.5 and 2.0),
  mentor_style text not null default 'balanced'
    check (mentor_style in ('supportive', 'balanced', 'challenging')),
  coaching_intensity text not null default 'medium'
    check (coaching_intensity in ('low', 'medium', 'high')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.user_preferences is
  'One row per user (1:1 with profiles), auto-created by '
  'handle_new_user() alongside the profile row. Holds mentor/UX '
  'preferences that are not yet used by any Phase 1A feature but are '
  'read by Mentor/Voice in Phase 1B so those features ship without a '
  'schema migration.';

create trigger set_user_preferences_updated_at
  before update on public.user_preferences
  for each row
  execute function public.set_updated_at();

-- RLS -----------------------------------------------------------------

alter table public.user_preferences enable row level security;

create policy "user_preferences_select_own"
  on public.user_preferences
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "user_preferences_update_own"
  on public.user_preferences
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- No insert/delete policy for authenticated: the row is created only by
-- handle_new_user() (security definer) and removed only via the
-- `on delete cascade` when the owning profile/auth user is deleted.
-- This guarantees the 1:1 invariant — a user can never end up with zero
-- or multiple preference rows via client writes.

-- Extend handle_new_user() ---------------------------------------------
-- Redefines the same trigger function introduced in 0004_handle_new_user.sql
-- to also seed a default user_preferences row for every new auth user,
-- in the same transaction as the profiles insert (so the two rows are
-- never out of sync — a user is never left without preferences).

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;

  insert into public.user_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

-- Backfill: any profile created before this migration (i.e. before
-- user_preferences existed) would otherwise never get a preferences row
-- since the trigger only fires on auth.users insert, not retroactively.
insert into public.user_preferences (user_id)
select p.id
from public.profiles p
left join public.user_preferences up on up.user_id = p.id
where up.user_id is null;
