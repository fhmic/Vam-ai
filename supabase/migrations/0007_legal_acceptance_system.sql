-- 0007_legal_acceptance_system.sql
-- CTO Review Foundation Hardening — Change #1: Legal Acceptance System
--
-- Replaces reliance on the single `profiles.terms_accepted_at` timestamp
-- with a proper versioned, auditable legal-acceptance ledger. This lets us:
--   - publish multiple legal documents (terms, privacy, AUP, AI consent, ...)
--   - publish multiple versions of each document over time
--   - keep every historical acceptance record immutable (never overwritten)
--   - require re-acceptance whenever a document a user already accepted
--     gets a newer published version
--
-- `profiles.terms_accepted_at` is intentionally left in place (see
-- migration 0003/0006) as a cheap "has this user ever accepted anything"
-- flag for lightweight UI checks — it is NOT the source of truth anymore.
-- The source of truth is `legal_acceptances`.

create table if not exists public.legal_documents (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  version text not null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  unique (slug, version)
);

comment on table public.legal_documents is
  'Catalog of legal documents (terms, privacy policy, etc). One row per '
  'version. A document is enforceable only once published_at is set.';
comment on column public.legal_documents.slug is
  'Stable identifier for a document family, e.g. terms-of-service. '
  'Multiple rows may share a slug (one per version).';
comment on column public.legal_documents.version is
  'Free-form version label (e.g. 2025-01-15 or 1.0.0). Combined with '
  'slug, uniquely identifies a specific published document.';

create table if not exists public.legal_acceptances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  document_id uuid not null references public.legal_documents(id),
  accepted_at timestamptz not null default now(),
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now(),
  unique (user_id, document_id)
);

comment on table public.legal_acceptances is
  'Immutable audit ledger of legal-document acceptances. Rows are never '
  'updated or deleted by application code — a new document version '
  'requires a new row, not a mutation of an old one. Written exclusively '
  'by trusted server routes (service role) so ip_address/user_agent are '
  'trustworthy and accepted_at cannot be backdated by the client.';

create index if not exists legal_acceptances_user_id_idx
  on public.legal_acceptances (user_id);
create index if not exists legal_acceptances_document_id_idx
  on public.legal_acceptances (document_id);

-- RLS ---------------------------------------------------------------------

alter table public.legal_documents enable row level security;
alter table public.legal_acceptances enable row level security;

-- Legal documents are public content — anyone (including anonymous
-- visitors on /sign-up) can read published versions so they can review
-- terms before creating an account. Only published rows are visible;
-- draft/unpublished versions stay invisible until publish_at is set.
create policy "legal_documents_select_published"
  on public.legal_documents
  for select
  to anon, authenticated
  using (published_at is not null and published_at <= now());

-- No insert/update/delete policies for anon/authenticated: publishing new
-- legal document versions is an operator action performed via the
-- service role (future back-office tooling), never client-writable.

-- Users may read their own acceptance history (e.g. a "legal" tab in
-- settings showing what they agreed to and when).
create policy "legal_acceptances_select_own"
  on public.legal_acceptances
  for select
  to authenticated
  using (auth.uid() = user_id);

-- No insert/update/delete policies for authenticated: acceptance rows are
-- written only by trusted server routes using the service-role client,
-- because ip_address/user_agent must be derived from the request, never
-- trusted from client-supplied values, and accepted_at must reflect the
-- server's clock at time of acceptance.

-- Seed data ---------------------------------------------------------------
-- Initial published versions, inserted in the migration itself (not just
-- supabase/seed.sql) so `supabase db push` publishes them in every
-- environment — staging and prod need real rows here, not just local dev.
-- Slugs correspond 1:1 with the routes under src/app/legal/. Bump the
-- version (new row, same slug) whenever the document text changes, to
-- force re-acceptance — see docs/adr/ADR-004-legal-acceptance-audit-design.md.
insert into public.legal_documents (name, slug, version, published_at)
values
  ('Terms of Service', 'terms-of-service', '2025-01-01', now()),
  ('Privacy Policy', 'privacy-policy', '2025-01-01', now()),
  ('Acceptable Use Policy', 'acceptable-use-policy', '2025-01-01', now()),
  ('AI and Voice Processing Consent', 'ai-consent', '2025-01-01', now())
on conflict (slug, version) do nothing;
