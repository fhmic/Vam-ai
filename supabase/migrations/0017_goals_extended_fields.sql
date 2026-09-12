-- 0017_goals_extended_fields.sql
-- Stage 3.1 — Goal management enhancements.

alter table public.goals
  add column if not exists target_date date,
  add column if not exists priority text not null default 'medium'
    check (priority in ('low', 'medium', 'high')),
  add column if not exists category text;

comment on column public.goals.category is
  'Free-form label, typically mirroring profiles.primary_goal (e.g. '
  '"Ace Interviews") but not FK-constrained to it, so a user can track '
  'a goal outside the fixed onboarding goal list.';
