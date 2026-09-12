-- 0021_coaching_frameworks.sql
-- Stage 4.2 — Executive coaching frameworks.
--
-- Reference/config data, same pattern as mentors (0011). `framework_prompt`
-- is a system-prompt fragment injected alongside the mentor persona when
-- a framework is relevant to the user's stated goal — see
-- src/lib/coaching/frameworks.ts.

create table if not exists public.coaching_frameworks (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null,
  framework_prompt text not null,
  applicable_goals text[] not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.coaching_frameworks enable row level security;

create policy "coaching_frameworks_select_active"
  on public.coaching_frameworks
  for select
  to authenticated
  using (is_active = true);

insert into public.coaching_frameworks (slug, name, description, framework_prompt, applicable_goals)
values
  (
    'grow-model',
    'GROW Model',
    'Goal, Reality, Options, Will — a structured coaching conversation flow.',
    'When helping the user work through a specific decision or problem, structure the ' ||
    'conversation using the GROW model: clarify the Goal, explore the current Reality, ' ||
    'generate Options, then confirm what they Will actually do. Do not announce the ' ||
    'framework by name unless asked; just use its structure.',
    array['Leadership Communication', 'Become More Persuasive']
  ),
  (
    'sbi-feedback',
    'SBI Feedback Model',
    'Situation-Behavior-Impact — a structure for giving concrete, non-judgmental feedback.',
    'When helping the user prepare feedback for someone else, coach them to frame it as ' ||
    'Situation (when/where), Behavior (what was observed, factually), and Impact (the ' ||
    'effect it had) — rather than broad judgments about the other person''s character.',
    array['Leadership Communication', 'Improve Meetings']
  ),
  (
    'star-interview',
    'STAR Method',
    'Situation-Task-Action-Result — a structure for answering behavioral interview questions.',
    'When helping the user prepare interview answers, coach them to structure each answer ' ||
    'as Situation, Task, Action, Result, with the Result being specific and, where ' ||
    'possible, quantified.',
    array['Ace Interviews']
  ),
  (
    'executive-presence-pillars',
    'Executive Presence Pillars',
    'Gravitas, communication, and appearance as the three pillars of executive presence.',
    'When the user is working on executive presence, organize your feedback around three ' ||
    'pillars: gravitas (composure and decisiveness under pressure), communication ' ||
    '(clarity and command of a room), and appearance (the non-verbal signals that ' ||
    'reinforce or undercut the first two).',
    array['Executive Presence']
  )
on conflict (slug) do nothing;
