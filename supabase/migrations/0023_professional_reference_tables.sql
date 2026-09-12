-- 0023_professional_reference_tables.sql
-- Product Redefinition — Onboarding Overhaul (Phase 1 of the redefinition).
--
-- Three new reference/config tables, same pattern as mentors (0011),
-- legal_documents (0007), coaching_frameworks (0021): migration-managed,
-- public read-only, never client-writable. The redefinition brief
-- specifically calls out that the industry list "should be extensible
-- and maintained centrally" — a proper table (not a CHECK-constrained
-- enum column) is what makes adding a new industry later a plain
-- migration insert rather than an enum-alteration migration. Applied
-- the same reasoning to functional areas and current roles for
-- consistency, since both lists are similarly long and expected to grow.

create table if not exists public.industries (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.industries enable row level security;

create policy "industries_select_active"
  on public.industries
  for select
  to authenticated
  using (is_active = true);

create table if not exists public.functional_areas (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.functional_areas enable row level security;

create policy "functional_areas_select_active"
  on public.functional_areas
  for select
  to authenticated
  using (is_active = true);

create table if not exists public.current_roles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.current_roles enable row level security;

create policy "current_roles_select_active"
  on public.current_roles
  for select
  to authenticated
  using (is_active = true);

-- Seed data — from the product redefinition brief's Industry Selection,
-- Functional Area, and Current Role lists, verbatim.

insert into public.industries (slug, name) values
  ('accounting', 'Accounting'),
  ('audit', 'Audit'),
  ('agriculture', 'Agriculture'),
  ('aviation', 'Aviation'),
  ('banking', 'Banking'),
  ('capital-markets', 'Capital Markets'),
  ('consulting', 'Consulting'),
  ('construction', 'Construction'),
  ('education', 'Education'),
  ('energy', 'Energy'),
  ('engineering', 'Engineering'),
  ('entertainment', 'Entertainment'),
  ('financial-services', 'Financial Services'),
  ('fintech', 'FinTech'),
  ('government', 'Government'),
  ('public-sector', 'Public Sector'),
  ('healthcare', 'Healthcare'),
  ('hospitality', 'Hospitality'),
  ('human-resources', 'Human Resources'),
  ('insurance', 'Insurance'),
  ('information-technology', 'Information Technology'),
  ('legal-services', 'Legal Services'),
  ('logistics', 'Logistics'),
  ('manufacturing', 'Manufacturing'),
  ('media', 'Media'),
  ('mining', 'Mining'),
  ('non-profit', 'Non-Profit'),
  ('oil-gas', 'Oil & Gas'),
  ('pharmaceuticals', 'Pharmaceuticals'),
  ('procurement', 'Procurement'),
  ('real-estate', 'Real Estate'),
  ('retail', 'Retail'),
  ('telecommunications', 'Telecommunications'),
  ('technology', 'Technology'),
  ('transportation', 'Transportation'),
  ('utilities', 'Utilities'),
  ('professional-services', 'Professional Services'),
  ('other', 'Other')
on conflict (slug) do nothing;

insert into public.functional_areas (slug, name) values
  ('finance', 'Finance'),
  ('accounting', 'Accounting'),
  ('treasury', 'Treasury'),
  ('audit', 'Audit'),
  ('tax', 'Tax'),
  ('operations', 'Operations'),
  ('human-resources', 'Human Resources'),
  ('information-technology', 'Information Technology'),
  ('risk-management', 'Risk Management'),
  ('compliance', 'Compliance'),
  ('procurement', 'Procurement'),
  ('sales', 'Sales'),
  ('marketing', 'Marketing'),
  ('customer-service', 'Customer Service'),
  ('strategy', 'Strategy'),
  ('legal', 'Legal'),
  ('administration', 'Administration'),
  ('business-development', 'Business Development')
on conflict (slug) do nothing;

insert into public.current_roles (slug, name) values
  ('intern', 'Intern'),
  ('graduate-trainee', 'Graduate Trainee'),
  ('assistant', 'Assistant'),
  ('officer', 'Officer'),
  ('analyst', 'Analyst'),
  ('associate', 'Associate'),
  ('supervisor', 'Supervisor'),
  ('specialist', 'Specialist'),
  ('coordinator', 'Coordinator'),
  ('team-lead', 'Team Lead'),
  ('manager', 'Manager'),
  ('senior-manager', 'Senior Manager'),
  ('head-of-department', 'Head of Department'),
  ('general-manager', 'General Manager'),
  ('director', 'Director'),
  ('vice-president', 'Vice President'),
  ('cfo', 'CFO'),
  ('coo', 'COO'),
  ('ceo', 'CEO'),
  ('founder', 'Founder'),
  ('board-member', 'Board Member')
on conflict (slug) do nothing;
