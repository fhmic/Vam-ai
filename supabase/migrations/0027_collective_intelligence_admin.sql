-- 0027_collective_intelligence_admin.sql
-- Phase 2: consented, aggregate-only Collective Intelligence and the
-- least-privilege identity needed by the back-office UI.

create table public.admin_users (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.collective_intelligence_consents (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  consented_at timestamptz not null default now(),
  revoked_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint collective_intelligence_consents_dates_check
    check (revoked_at is null or revoked_at >= consented_at)
);

-- This table intentionally has no user_id, raw message, assessment answer,
-- email, or quasi-identifier. It can only hold reviewable cohort-level output.
create table public.collective_insights (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 3 and 160),
  summary text not null check (char_length(summary) between 20 and 2000),
  category text not null check (char_length(category) between 2 and 80),
  cohort_description text not null check (char_length(cohort_description) between 3 and 240),
  sample_size integer not null check (sample_size >= 10),
  period_start date not null,
  period_end date not null,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  published_at timestamptz,
  created_by uuid references public.admin_users(user_id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint collective_insights_period_check check (period_end >= period_start),
  constraint collective_insights_published_check
    check ((status = 'published' and published_at is not null) or (status <> 'published' and published_at is null))
);

create index collective_insights_publication_idx
  on public.collective_insights (status, published_at desc);

create trigger set_collective_intelligence_consents_updated_at
  before update on public.collective_intelligence_consents
  for each row execute function public.set_updated_at();
create trigger set_collective_insights_updated_at
  before update on public.collective_insights
  for each row execute function public.set_updated_at();

alter table public.admin_users enable row level security;
alter table public.collective_intelligence_consents enable row level security;
alter table public.collective_insights enable row level security;

-- An authenticated user may establish their own consent but can never grant
-- themselves administrative access or inspect another person's consent.
create policy "Users can view their own admin membership"
  on public.admin_users for select to authenticated using (user_id = auth.uid());

create policy "Users can view their own collective intelligence consent"
  on public.collective_intelligence_consents for select to authenticated using (user_id = auth.uid());
create policy "Users can create their own collective intelligence consent"
  on public.collective_intelligence_consents for insert to authenticated with check (user_id = auth.uid());
create policy "Users can update their own collective intelligence consent"
  on public.collective_intelligence_consents for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "Anyone authenticated can read published collective insights"
  on public.collective_insights for select to authenticated using (status = 'published');

-- Bootstrap an administrator only with the service role / SQL console, e.g.:
-- insert into public.admin_users (user_id) values ('<auth user uuid>');
