-- 0020_assessments.sql
-- Stage 4.1 — Assessments.
--
-- Same reference-data-vs-user-data split used throughout: templates are
-- config (migration-managed, public read), responses/scores are user
-- data (owner-select only, server-written since scoring requires a
-- Groq call and must not be forgeable by the client).

create table if not exists public.assessment_templates (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text not null,
  schema jsonb not null,          -- question definitions, see src/lib/assessments/schema.ts
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.assessment_templates enable row level security;

create policy "assessment_templates_select_active"
  on public.assessment_templates
  for select
  to authenticated
  using (is_active = true);

create table if not exists public.assessment_responses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  template_id uuid not null references public.assessment_templates(id),
  answers jsonb not null,
  submitted_at timestamptz not null default now()
);

create index if not exists assessment_responses_user_idx
  on public.assessment_responses (user_id, submitted_at desc);

alter table public.assessment_responses enable row level security;

create policy "assessment_responses_select_own"
  on public.assessment_responses
  for select
  to authenticated
  using (auth.uid() = user_id);

-- No insert policy for `authenticated`: submission goes through
-- /api/assessments/submit (admin client, after verifyAuthenticatedUser),
-- since a response and its score are written together and the score
-- requires a Groq call the client cannot be trusted to compute itself.

create table if not exists public.assessment_scores (
  id uuid primary key default gen_random_uuid(),
  response_id uuid not null unique references public.assessment_responses(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  scores jsonb not null,           -- { [dimension]: number }
  narrative_summary text not null,
  created_at timestamptz not null default now()
);

create index if not exists assessment_scores_user_idx
  on public.assessment_scores (user_id, created_at desc);

alter table public.assessment_scores enable row level security;

create policy "assessment_scores_select_own"
  on public.assessment_scores
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Seed one baseline assessment, available as an on-demand check-in
-- (not forced at onboarding — onboarding in this codebase only handles
-- legal acceptance + profile fields, see migration 0007/0008).
insert into public.assessment_templates (slug, title, description, schema)
values (
  'communication-style-baseline',
  'Communication Style Baseline',
  'A short check-in to establish (and later track change in) how you communicate under pressure.',
  '{
    "questions": [
      { "id": "confidence_pressure", "type": "likert", "prompt": "I feel confident speaking up in high-pressure meetings.", "scale": 5 },
      { "id": "clarity_feedback", "type": "likert", "prompt": "I give feedback clearly without over-softening it.", "scale": 5 },
      { "id": "structure_presenting", "type": "likert", "prompt": "I structure my points before presenting them.", "scale": 5 },
      { "id": "recent_challenge", "type": "open", "prompt": "Describe a recent conversation that did not go the way you wanted." }
    ]
  }'::jsonb
)
on conflict (slug) do nothing;
