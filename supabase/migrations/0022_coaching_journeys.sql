-- 0022_coaching_journeys.sql
-- Stage 4.3 — Personalised coaching journeys.
--
-- A journey is a fixed, ordered curriculum (reference data, like
-- mentors/coaching_frameworks). Per-user progress through it is
-- server-controlled (admin client via /api/journeys/advance) rather
-- than a raw client update, so a user can't skip steps by editing
-- current_step directly.

create table if not exists public.coaching_journeys (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text not null,
  primary_goal text,              -- suggests this journey when it matches profiles.primary_goal
  steps jsonb not null,           -- [{ "order": 1, "title": "...", "objective": "..." }, ...]
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.coaching_journeys enable row level security;

create policy "coaching_journeys_select_active"
  on public.coaching_journeys
  for select
  to authenticated
  using (is_active = true);

create table if not exists public.user_journey_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  journey_id uuid not null references public.coaching_journeys(id),
  current_step int not null default 1,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (user_id, journey_id)
);

create index if not exists user_journey_progress_user_idx on public.user_journey_progress (user_id);

alter table public.user_journey_progress enable row level security;

create policy "user_journey_progress_select_own"
  on public.user_journey_progress
  for select
  to authenticated
  using (auth.uid() = user_id);

-- No insert/update policy for `authenticated`: starting a journey and
-- advancing through it both go through /api/journeys/advance (admin
-- client), which is what enforces sequential progression server-side.

insert into public.coaching_journeys (slug, title, description, primary_goal, steps)
values (
  'ace-interviews-4-week',
  'Ace Your Next Interview',
  'A four-step path from framing your story to handling curveball questions.',
  'Ace Interviews',
  '[
    { "order": 1, "title": "Tell your story", "objective": "Build a clear, concise narrative of your background and why you are looking." },
    { "order": 2, "title": "STAR your examples", "objective": "Convert your top 3-5 accomplishments into STAR-structured answers." },
    { "order": 3, "title": "Handle the hard questions", "objective": "Practice weaknesses, gaps, and behavioral curveballs without getting defensive." },
    { "order": 4, "title": "Close strong", "objective": "Prepare thoughtful questions for the interviewer and a confident close." }
  ]'::jsonb
),
(
  'executive-presence-6-week',
  'Build Executive Presence',
  'A six-step path across the gravitas, communication, and appearance pillars.',
  'Executive Presence',
  '[
    { "order": 1, "title": "Baseline self-assessment", "objective": "Identify your strongest and weakest pillar today." },
    { "order": 2, "title": "Composure under pressure", "objective": "Practice staying measured when challenged in the moment." },
    { "order": 3, "title": "Command the room", "objective": "Work on vocal tone, pacing, and pausing in group settings." },
    { "order": 4, "title": "Say more with less", "objective": "Cut filler and hedging language from your speech." },
    { "order": 5, "title": "Non-verbal signals", "objective": "Align posture and presence with your verbal message." },
    { "order": 6, "title": "Sustain it", "objective": "Build habits that hold up under real deadline pressure." }
  ]'::jsonb
)
on conflict (slug) do nothing;
