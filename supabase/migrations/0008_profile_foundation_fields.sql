-- 0008_profile_foundation_fields.sql
-- CTO Review Foundation Hardening — Change #2: Profile Foundation Fields
--
-- Adds the baseline demographic/goal fields collected during onboarding
-- that Communication DNA, Assessments, and Progress (Phase 1B+) will key
-- off of. Nullable + check-constrained rather than enum types, so adding
-- a new allowed value later is a simple constraint migration rather than
-- an enum-alteration migration (which Postgres makes more awkward).

alter table public.profiles
  add column if not exists profession text
    check (profession in (
      'Student', 'Professional', 'Manager', 'Executive', 'Founder',
      'Consultant', 'Job Seeker'
    )),
  add column if not exists experience_level text
    check (experience_level in ('Beginner', 'Intermediate', 'Advanced')),
  add column if not exists primary_goal text
    check (primary_goal in (
      'Improve Confidence', 'Executive Presence', 'Ace Interviews',
      'Improve Presentations', 'Improve Meetings',
      'Become More Persuasive', 'Leadership Communication'
    ));

comment on column public.profiles.profession is
  'Self-reported profession category, captured during onboarding.';
comment on column public.profiles.experience_level is
  'Self-reported communication experience level, captured during onboarding.';
comment on column public.profiles.primary_goal is
  'Primary stated goal for using VA, captured during onboarding. Feeds '
  'initial Communication DNA + goal seeding in Phase 1B.';

-- These are user-owned attributes (unlike plan/onboarding_completed_at),
-- so — same column-grant pattern as migration 0006 — grant self-update
-- access in addition to the columns already granted there. The
-- onboarding route currently writes these via the service-role client
-- (see /api/onboarding/complete), but granting them here means a future
-- "edit profile" settings page can let users update these directly
-- through RLS without a new server route.
grant update (profession, experience_level, primary_goal)
  on public.profiles
  to authenticated;
