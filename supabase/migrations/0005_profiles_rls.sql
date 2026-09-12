-- 0005_profiles_rls.sql
-- RLS policy pattern used across the whole app (documented in the
-- Phase 1 blueprint, Section 7.5):
--   - select/update: owner-only (auth.uid() = id)
--   - insert: NOT allowed from the client — rows are created only by
--     the handle_new_user() trigger (security definer), so a user can
--     never create a profile for another id or spoof onboarding state
--     via a direct insert.
--   - delete: NOT allowed from the client — account deletion is a
--     controlled server-side flow (added in a later phase).

alter table public.profiles enable row level security;

create policy "profiles_select_own"
  on public.profiles
  for select
  to authenticated
  using (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- No insert/delete policies are defined for the `authenticated` role,
-- which means both are denied by default under RLS.
