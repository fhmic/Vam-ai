-- 0006_profiles_column_grants.sql
-- RLS controls *which rows* a user can touch, but not *which columns*.
-- Without this, the "profiles_update_own" policy would let a user set
-- their own plan to 'pro' or forge onboarding_completed_at directly.
-- We revoke blanket UPDATE and grant it back only on the columns a
-- user should be able to self-manage. Server-controlled columns
-- (plan, onboarding_completed_at) are updated only via Route Handlers
-- using the service role, which bypasses column grants entirely.

revoke update on public.profiles from authenticated;

grant update (display_name, avatar_url, timezone, terms_accepted_at)
  on public.profiles
  to authenticated;
