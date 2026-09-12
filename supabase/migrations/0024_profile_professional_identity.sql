-- 0024_profile_professional_identity.sql
-- Product Redefinition — Onboarding Overhaul.
--
-- Supersedes migration 0008's profession/experience_level with a more
-- precise professional-identity model: a specific current role (FK),
-- a broad career-level band, an industry (FK), a functional area (FK),
-- an organization name, and a country. primary_goal is untouched — it
-- answers a different question ("what do you want to achieve") that
-- the redefinition brief doesn't replace.
--
-- career_level stays a simple CHECK-constrained column rather than a
-- reference table: it's a fixed, ordered 6-value progression band that
-- the brief doesn't ask to be extensible, unlike industries/functional
-- areas/current roles. country is deliberately NOT a DB reference
-- table either — it's validated against a stable, standard list at the
-- application layer (src/lib/onboarding/constants.ts) rather than
-- adding a 190+ row table for something that essentially never changes.

alter table public.profiles
  add column if not exists organization_name text,
  add column if not exists country text,
  add column if not exists industry_id uuid references public.industries(id),
  add column if not exists functional_area_id uuid references public.functional_areas(id),
  add column if not exists current_role_id uuid references public.current_roles(id),
  add column if not exists career_level text
    check (career_level in (
      'Entry Level', 'Early Career', 'Mid Level',
      'Senior Level', 'Executive Level', 'Board Level'
    ));

comment on column public.profiles.organization_name is
  'Free-text employer/organization name, captured during onboarding.';
comment on column public.profiles.country is
  'Self-reported country, validated against src/lib/onboarding/constants.ts COUNTRIES at the application layer.';
comment on column public.profiles.career_level is
  'Self-reported career band, captured during onboarding. Distinct from '
  'current_role_id: a "Manager" at one organization might place '
  'themselves at Mid Level while at another they''d say Senior Level — '
  'the two are independently selected, not derived from one another.';

-- profession/experience_level (migration 0008) are superseded by
-- current_role_id + career_level, which are strictly more precise for
-- the same purpose (personalizing mentor matching, scenarios, and
-- prompt context). Dropped rather than left alongside the new columns
-- to avoid two competing "who is this user, professionally" fields —
-- same reasoning as dropping profiles.terms_accepted_at in favor of
-- legal_acceptances during Foundation Hardening.
alter table public.profiles
  drop column if exists profession,
  drop column if exists experience_level;

-- Same self-service column-grant pattern as migration 0008: these are
-- user-owned professional-identity attributes, not server-controlled
-- state like plan/onboarding_completed_at, so client-direct RLS update
-- is appropriate (in addition to the write the onboarding route itself
-- performs via the admin client at signup time).
grant update (organization_name, country, industry_id, functional_area_id, current_role_id, career_level)
  on public.profiles
  to authenticated;
