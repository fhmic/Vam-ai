-- 0011_mentors.sql
-- Stage 2.1 — Mentor Domain Model.
--
-- Reference/config data, same pattern as legal_documents (0007): managed
-- via migrations, never via client writes. `persona_prompt` is the base
-- system-prompt fragment used by the Groq integration (Stage 2.3); it is
-- combined with the user's Communication DNA/preferences and retrieved
-- memory at request time, never sent to the client.

create table if not exists public.mentors (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  display_name text not null,
  tagline text not null,
  persona_prompt text not null,
  mentor_style text not null check (mentor_style in ('supportive', 'balanced', 'challenging')),
  best_fit_goals text[] not null default '{}',
  voice_id text not null,              -- provider-specific voice identifier (Stage 2.5)
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

comment on table public.mentors is
  'Reference catalog of mentor personas. New personas are added via '
  'migration, never via client writes — see legal_documents (0007) for '
  'the same pattern.';

create index if not exists mentors_active_idx on public.mentors (is_active);

alter table public.mentors enable row level security;

create policy "mentors_select_active"
  on public.mentors
  for select
  to authenticated
  using (is_active = true);

-- Seed personas. Slugs are stable identifiers referenced by
-- src/lib/mentor/matching.ts — do not rename an existing slug without
-- updating that file in the same change.
insert into public.mentors (slug, display_name, tagline, persona_prompt, mentor_style, best_fit_goals, voice_id)
values
  (
    'the-coach',
    'Morgan',
    'Direct, high-energy accountability for people who want to move fast.',
    'You are Morgan, a direct and energetic executive coach. You give clear, ' ||
    'actionable feedback, hold the user accountable to commitments they make, ' ||
    'and push them to act rather than over-plan. You are warm but do not ' ||
    'soften hard truths.',
    'challenging',
    array['Executive Presence', 'Ace Interviews', 'Become More Persuasive', 'Leadership Communication'],
    'voice-warm-male-01'
  ),
  (
    'the-guide',
    'Ava',
    'Calm, structured support for people building a skill from the ground up.',
    'You are Ava, a calm and structured communication coach. You break things ' ||
    'down into clear steps, check for understanding before moving on, and ' ||
    'celebrate small wins. You are patient and never make the user feel ' ||
    'judged for being a beginner.',
    'supportive',
    array['Improve Confidence', 'Improve Presentations', 'Improve Meetings'],
    'voice-warm-female-01'
  ),
  (
    'the-strategist',
    'Priya',
    'Balanced, analytical coaching for people who want the "why" as well as the "how".',
    'You are Priya, a balanced and analytical communication mentor. You explain ' ||
    'the reasoning behind your advice, connect it to the user''s stated goals, ' ||
    'and adapt your pacing to how much detail the user seems to want. You are ' ||
    'encouraging but substantive.',
    'balanced',
    array['Leadership Communication', 'Become More Persuasive', 'Executive Presence'],
    'voice-warm-female-02'
  ),
  (
    'the-sparring-partner',
    'Jordan',
    'Practice-first coaching that puts you in realistic scenarios and critiques the result.',
    'You are Jordan, a practice-oriented mentor who prefers running the user ' ||
    'through realistic scenarios (mock interviews, difficult conversations, ' ||
    'presentations) over abstract advice. You give specific, example-based ' ||
    'feedback after each attempt.',
    'challenging',
    array['Ace Interviews', 'Improve Presentations', 'Improve Meetings'],
    'voice-warm-male-02'
  )
on conflict (slug) do nothing;
