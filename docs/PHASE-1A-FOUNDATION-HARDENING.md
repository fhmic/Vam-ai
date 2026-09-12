# Phase 1A Foundation Hardening — Implementation Guide

This is the change log and step-by-step guide for the hardening pass
applied before Phase 1B, addressing the 8 CTO review findings. Nothing
under Mentor, Groq, Memory, Communication DNA, Voice, Assessments,
Progress, Role Plays, Challenges, Achievements, or Live Discussions was
touched — those remain entirely Phase 1B+ scope.

## What changed, by finding

### 1. Legal Acceptance System
- **New:** `legal_documents`, `legal_acceptances` tables
  (`supabase/migrations/0007_legal_acceptance_system.sql`), seeded with
  the four currently-required documents.
- **New:** `src/lib/legal/acceptance.ts` (required-slug list, missing-
  acceptance diff, service-role write helper), `src/lib/legal/routes.ts`
  (slug → page route map).
- **New:** `/legal/re-accept` page + `/api/legal/re-accept` route — the
  mechanism that makes "future legal updates require re-acceptance"
  real (see `docs/adr/ADR-004-legal-acceptance-audit-design.md`).
- **Changed:** onboarding form/route now write real acceptance rows
  instead of only `profiles.terms_accepted_at`.
- **Fixed (blocking bug found along the way):** every page under
  `src/app/legal/*` was raw text with no component export — `next
  build` could not have been passing. Rewrapped in a shared
  `src/components/legal/legal-document.tsx` component; original text is
  unchanged.
- **Changed:** `middleware.ts` gates onboarded users through
  `/legal/re-accept` when stale, via a 24-hour fast-path cookie (see
  `docs/adr/ADR-003-cookie-onboarding-optimization.md`).

### 2. Profile Foundation Fields
- **New:** `profession`, `experience_level`, `primary_goal` columns
  (`supabase/migrations/0008_profile_foundation_fields.sql`).
- **Changed:** onboarding form collects them; onboarding route persists
  them; `database.ts` types updated.

### 3. Soft Delete Capability
- **New:** `profiles.deleted_at`
  (`supabase/migrations/0009_profiles_soft_delete.sql`).
- **Not implemented (by design, see Change #3's own scope note):** the
  deletion route, recovery UI, and cleanup job. Recommended workflow is
  documented in `README.md` § "Soft delete".

### 4. User Preferences Table
- **New:** `user_preferences`
  (`supabase/migrations/0010_user_preferences.sql`), auto-created by an
  extended `handle_new_user()` trigger, with a backfill for
  pre-existing profiles.

### 5. Automated Database Deployment
- **Fixed (root cause of "CI doesn't run"):** the old workflow lived at
  `.github/workflow/sci.yml` — wrong directory name (`workflow`, not
  `workflows`) and a typo'd filename. GitHub Actions never discovered
  it. Moved to `.github/workflows/ci.yml`.
- **Changed:** `ci.yml` now also runs `npm test` and a grep-based check
  for server-only secrets leaking outside server-only files.
- **New:** `.github/workflows/deploy.yml` — runs after CI succeeds on
  `main`, dry-run verifies migrations against the linked project, then
  applies them. Required secrets and production-safe migration guidance
  are documented in `README.md` § "CI/CD".

### 6. Admin Client Safety
- **New:** `src/lib/supabase/auth-guard.ts` —
  `verifyAuthenticatedUser()`, the single required first call before
  any Route Handler touches `createAdminClient()`. See
  `docs/adr/ADR-002-service-role-isolation.md`.
- **Changed:** `/api/onboarding/complete` and the new
  `/api/legal/re-accept` both use it.

### 7. Foundation Testing
- **New:** `vitest.config.ts`, `tests/` (unit + integration split, with
  integration tests self-skipping until a disposable test project is
  configured). Covers all 5 priority areas from the review — see
  `tests/README.md` for the full breakdown and how to wire up
  integration tests.

### 8. Architectural Decisions
- **New:** `docs/adr/ADR-001` through `ADR-004`, covering exactly the
  four areas the review asked for (column grants, service-role
  isolation, cookie optimization, legal acceptance audit design).

## Setting this up locally

1. `npm install` — picks up the new `dotenv` devDependency (used only by
   `tests/setup.ts` for optional integration-test config).
2. `supabase stop && supabase start` (or `supabase db reset` if already
   running) — applies migrations `0007`–`0010` and re-seeds
   `legal_documents`.
3. `npm run db:types` if you have a linked project you want live types
   from; otherwise the hand-maintained `src/types/database.ts` in this
   change already reflects the new schema.
4. `npm test` — unit tests (schema validation, middleware routing, legal
   slug/route consistency) run immediately with no setup. Integration
   tests stay skipped until `.env.test` is configured — see
   `tests/README.md`.
5. `npm run dev` and walk through onboarding once to confirm: the
   profile-fields step, the legal-acceptance checkbox (links should open
   the now-fixed `/legal/*` pages), and that `/dashboard` loads after.

## Setting this up in CI/CD

1. Add the 5 secrets listed in `README.md` § "CI/CD" to the repo's
   Actions secrets.
2. Confirm `.github/workflows/ci.yml` shows up under the repo's Actions
   tab (it will, now that it's in the right directory) and goes green on
   the next push/PR.
3. Merge to `main` once, confirm `deploy.yml` triggers off the
   successful `CI` run and applies the pending migrations to the linked
   project.
4. Optional but recommended: point `TEST_SUPABASE_*` secrets at a
   dedicated (disposable) test project and add a `test` job to `ci.yml`
   so the integration tests actually run in CI rather than self-skipping
   — see `tests/README.md` § "Next steps".

## Explicitly out of scope for this pass

Per the brief this hardening pass is answering: Mentor, Groq, Memory,
Communication DNA, Voice, Assessments, Progress, Role Plays, Challenges,
Achievements, Live Discussions. Also out of scope, called out above as
deliberate follow-ups rather than oversights: the account-deletion route
and cleanup job (Change #3), an admin UI for publishing new legal
document versions (Change #1/ADR-004), and CI-wired integration tests
against a live test project (Change #7).
