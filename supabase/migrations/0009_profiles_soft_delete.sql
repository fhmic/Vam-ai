-- 0009_profiles_soft_delete.sql
-- CTO Review Foundation Hardening — Change #3: Soft Delete Capability
--
-- Adds a soft-delete marker to profiles so account deletion can offer a
-- recovery grace period instead of immediately, irreversibly destroying
-- data (required for a sane GDPR/CCPA-style deletion flow — see
-- Section 14.5 of the Phase 1 blueprint and ADR-004).
--
-- This migration ONLY adds the column. It intentionally does NOT:
--   - change any RLS policy to filter out deleted rows
--   - implement the deletion API route or the cleanup cron
-- Wiring those up is Phase 1B/1C work once account settings ships; the
-- column exists now so the schema never needs a breaking migration to
-- retrofit deletion later.

alter table public.profiles
  add column if not exists deleted_at timestamptz;

comment on column public.profiles.deleted_at is
  'Soft-delete marker. NULL = active account. When set, the account is '
  'in its recovery grace period and is excluded from active-user reads '
  'by application-level queries (not yet enforced at the RLS layer — '
  'see docs/adr and README ''Recommended future deletion workflow''). '
  'A scheduled job hard-deletes the auth.users row (cascading to all '
  'owned data) once the grace period elapses, which is what actually '
  'purges personal data — this column only marks the start of that '
  'window.';

create index if not exists profiles_deleted_at_idx
  on public.profiles (deleted_at)
  where deleted_at is not null;
