-- 0018_action_plans.sql
-- Stage 3.2 — Weekly action plans.
--
-- An action_plan is a week's worth of committed actions, optionally
-- tied to a goal. Items can be user-authored (client-direct insert,
-- like goals) or mentor-suggested via Groq (server-inserted via the
-- admin client, is_ai_suggested = true) — both live in the same table
-- so completion tracking/analytics don't need to special-case origin.

create table if not exists public.action_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  goal_id uuid references public.goals(id) on delete set null,
  week_start_date date not null,
  created_at timestamptz not null default now(),
  unique (user_id, week_start_date)
);

create index if not exists action_plans_user_week_idx
  on public.action_plans (user_id, week_start_date desc);

alter table public.action_plans enable row level security;

create policy "action_plans_select_own"
  on public.action_plans
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "action_plans_insert_own"
  on public.action_plans
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- No update/delete: a week's plan, once created, keeps the same
-- identity — items within it change, not the plan row itself.

create table if not exists public.action_plan_items (
  id uuid primary key default gen_random_uuid(),
  action_plan_id uuid not null references public.action_plans(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  is_ai_suggested boolean not null default false,
  is_completed boolean not null default false,
  completed_at timestamptz,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists action_plan_items_plan_idx
  on public.action_plan_items (action_plan_id, sort_order);

alter table public.action_plan_items enable row level security;

create policy "action_plan_items_select_own"
  on public.action_plan_items
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "action_plan_items_insert_own"
  on public.action_plan_items
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "action_plan_items_update_own"
  on public.action_plan_items
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Client can insert/update their own items (add a custom task, check
-- one off) — same low-sensitivity pattern as `goals`. AI-suggested
-- items are inserted via the admin client from
-- src/lib/action-plans/suggest.ts, but are then owned by the user like
-- any other row and can be edited/completed the same way once created.
