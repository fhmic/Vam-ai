# VA — Staging Readiness Guide

> **Superseded by [`docs/SETUP.md`](SETUP.md) for new deploys.** This
> document is preserved as the historical record of the Phase 1A Final
> Production Readiness Audit. SETUP.md covers the same ground (and more)
> against the current product surface — including voice, memory
> consolidation crons, the 30-day curriculum, and the
> collective-intelligence admin back-office. Use it as the source of
> truth; this file is the provenance for what was hardened, in what
> order, and why.

Produced by the Phase 1A Final Production Readiness Audit. This is the
step-by-step guide for taking the audited codebase from a local clone to
a working staging environment. It assumes the fixes described in
`docs/PHASE-1A-FINAL-AUDIT.md` have been committed and pushed.

---

## 1. Database

### 1.1 Migration validation procedure

1. Migrations live in `supabase/migrations/*.sql`, applied in numeric
   order. **Never edit a migration that has already been applied to any
   shared environment** — add a new migration instead, even to fix a
   mistake in an old one.
2. Before merging any PR that touches `supabase/migrations/`, confirm
   the `verify-migrations` job in `.github/workflows/ci.yml` passed. It
   boots a real local Supabase stack (Postgres + Auth) and applies every
   migration from scratch — this is what catches a broken migration
   before it reaches staging/production, not after.
3. To validate locally before pushing:
   ```bash
   supabase start        # applies every migration from scratch
   supabase db diff      # should show no unexpected drift
   supabase stop
   ```
4. To apply pending migrations to a linked staging project manually
   (only if you are not relying on `deploy.yml`'s automatic push):
   ```bash
   supabase link --project-ref <staging-project-ref>
   supabase db push --linked --dry-run   # review first
   supabase db push --linked
   ```

### 1.2 Rollback guidance

Postgres migrations in this project are **forward-only** — there is no
`down` migration mechanism configured. If a migration causes a problem
in staging/production:

1. **Prefer a forward-fix migration** (e.g. a new migration that drops a
   bad constraint or column) over attempting to reverse-apply. This
   keeps the migration history linear and matches what `supabase db
   push` expects.
2. If a migration must be reverted before any application code depends
   on its new shape, write and apply a new migration that explicitly
   undoes it (e.g. `drop table if exists ...`, `alter table ... drop
   column ...`) — do not delete or edit the original migration file
   once it has been applied anywhere.
3. For a full environment reset (staging/dev only, **never production**):
   ```bash
   supabase db reset --linked
   ```
   This drops and recreates the database from migrations + `seed.sql`.
   Destructive — confirm you're targeting the right project first.

### 1.3 Backup recommendations

- Enable Supabase's built-in daily backups (or Point-in-Time Recovery on
  a paid plan) for any project holding real user data, before onboarding
  real users to staging with realistic data volumes.
- `legal_acceptances` is the most compliance-sensitive table in the
  schema — it is the audit trail of what each user agreed to and when.
  Treat backup/restore drills for this table as a pre-launch checklist
  item, not an afterthought.

---

## 2. Application

### 2.1 Build verification

```bash
npm ci
npm run lint
npm run typecheck
npm test
npm run build
```

All four must pass with zero errors before a build is considered
staging-ready. As of this audit, all four pass locally (see
`docs/PHASE-1A-FINAL-AUDIT.md` for the actual command output) — **but
this had never been confirmed by GitHub Actions before this audit**,
because the workflow files were in a path GitHub Actions doesn't scan
(fixed — see that document, Phase 5). Confirm the `CI` workflow shows
green on the PR that merges this audit's fixes before trusting it as an
enforced gate going forward.

### 2.2 Environment variables

| Variable | Required for | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Build + runtime | Public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Build + runtime | Public |
| `SUPABASE_SERVICE_ROLE_KEY` | Runtime only | Server-only, never `NEXT_PUBLIC_` |
| `NEXT_PUBLIC_APP_URL` | Build + runtime | Used for auth redirect URLs — must match the actual staging URL |
| `TEST_SUPABASE_URL` / `TEST_SUPABASE_SERVICE_ROLE_KEY` / `TEST_SUPABASE_ANON_KEY` | CI only (integration tests) | Point at a **disposable** Supabase project, never staging/production — see Section 4 |

Set the first four in Vercel's project settings, scoped per environment
(Preview vs Production). See `.env.example` for the full annotated list.

### 2.3 Auth requirements

- Supabase project's Auth settings must have the staging `NEXT_PUBLIC_APP_URL`
  registered as an allowed redirect URL (`<url>/auth/callback`), or
  OAuth/email-confirm/recovery links will fail to resolve.
- If Google OAuth is enabled for staging, it needs its own OAuth client
  credentials configured in Supabase's Auth provider settings — these do
  not carry over from a different environment automatically.
- Email confirmation is required by default (`supabase/config.toml`,
  `enable_confirmations = true`) — staging testers need real, reachable
  email addresses, or confirmations must be disabled for that
  environment specifically (not recommended for anything that will
  later be promoted to production config).

---

## 3. Compliance

### 3.1 Legal acceptance validation

Before staging is opened to any real (non-team) user:

1. **Replace every placeholder in every document under `src/app/legal/`.**
   As of this audit, all 11 legal document pages (including all 4 that
   gate onboarding: Terms of Service, Privacy Policy, Acceptable Use
   Policy, AI Consent) contain literal `[Insert Date]` placeholder text.
   This must go through actual legal review before any real user sees
   it — engineering fixed the *system* (versioning, audit trail,
   enforcement), not the *text*, and the text is a legal/business
   deliverable, not an engineering one.
2. Confirm `REQUIRED_LEGAL_SLUGS` (`src/lib/legal/required-slugs.ts`)
   matches exactly the set of documents legal/compliance says must be
   gated — it is a hardcoded allowlist by design (see the file's own
   comment), so a new document type doesn't silently become required
   without a deliberate code change.
3. Confirm with legal/compliance whether bundling all four required
   documents under a single onboarding checkbox (current implementation
   in `onboarding-form.tsx`) is acceptable, or whether any of them —
   `ai-consent` in particular — needs its own separate, explicit
   checkbox for your jurisdiction(s). The re-accept flow already does
   this per-document; onboarding currently does not. This is a
   legal/product decision, not something this audit resolved
   unilaterally.

### 3.2 Legal version publishing process

To publish a new version of a required document (forcing re-acceptance
for every user who accepted the old one):

1. Update the document's page content under `src/app/legal/<slug>/page.tsx`.
2. Write a new migration inserting a new row into `legal_documents` with
   the same `slug`, a new `version` label, and `published_at: now()` (or
   a specific future timestamp). **Do not edit an existing row** —
   `legal_documents` is append-only by design (ADR-004).
3. Deploy the migration. From that point on, `getMissingLegalAcceptances`
   will surface every user whose latest acceptance doesn't match the new
   version, and `middleware.ts` will route them to `/legal/re-accept` on
   their next request (within the `va_legal_current` cookie's 24-hour
   freshness window at worst).

### 3.3 Re-acceptance verification

After publishing a new version, manually verify with a test account:

1. Confirm the account (previously onboarded, previously accepted the
   old version) is redirected to `/legal/re-accept` on its next
   protected-route request.
2. Confirm `/legal/re-accept` shows only the documents that actually
   changed, not the ones that didn't.
3. Confirm accepting writes a **new** row to `legal_acceptances` (not an
   update to the old one) and that the old row is untouched — this is
   the audit-trail guarantee the whole system exists for.

---

## 4. Security

### 4.1 Service-role review

- `SUPABASE_SERVICE_ROLE_KEY` must be set only in Vercel's server
  environment variables, never `NEXT_PUBLIC_`-prefixed.
- Every use of `createAdminClient()` (`src/lib/supabase/admin.ts`) must
  be preceded by `verifyAuthenticatedUser()` (`src/lib/supabase/auth-guard.ts`)
  in the same request. As of this audit, both existing privileged routes
  (`/api/onboarding/complete`, `/api/legal/re-accept`) are compliant —
  re-verify this for any new privileged route added after this audit
  (grep for `createAdminClient` and confirm each result's call site).
- CI's "Lint for leaked server-only secrets" step is a cheap grep-based
  guard, not a full bundle analyzer — re-evaluate this if the codebase's
  surface area grows significantly (Phase 1B onward).

### 4.2 Authorization review

- RLS is enabled on every table (`profiles`, `legal_documents`,
  `legal_acceptances`, `user_preferences`) with owner-scoped policies —
  confirmed via direct migration review in this audit.
- Column-level grants restrict which `profiles` columns a user can
  self-update (see ADR-001) — `plan`, `onboarding_completed_at`, and
  `deleted_at` are not client-writable even though the row itself is
  owned by the user.
- Soft-deleted accounts (`profiles.deleted_at` set) are rejected by
  `verifyAuthenticatedUser()` (all privileged API routes) and by the
  `(app)` layout (all authenticated pages) — added during this audit;
  confirm this still holds for any new privileged route or route group
  added later.

### 4.3 Privileged-operation review

See `docs/PHASE-1A-FINAL-AUDIT.md`, Phase 2, for the full routes-audited
table. Summary: both privileged routes in the current codebase are
compliant with the `verifyAuthenticatedUser()` pattern; no
non-compliant routes were found.

---

## 5. Deployment

### 5.1 CI requirements

Branch protection on `main` should require, at minimum:
- `CI / build` (lint, typecheck, unit tests, build, secret-leak check)
- `CI / verify-migrations` (migrations apply cleanly from scratch)

Both are jobs within the single `CI` workflow — `deploy.yml`'s
`workflow_run` trigger only fires after the entire `CI` workflow
completes, so requiring both as required status checks and relying on
`workflow_run`'s conclusion gate are consistent, not redundant.

**This assumes branch protection is actually configured in the GitHub
repository settings** — this audit could not verify or configure that
from within the codebase, since branch protection is a repository
setting, not a file in the repo. Confirm it directly in GitHub:
Settings → Branches → Branch protection rules → `main`.

### 5.2 Deployment order

1. PR merges to `main` → `CI` workflow runs (build + verify-migrations).
2. `CI` succeeds → `Deploy Supabase Migrations` workflow runs
   automatically (`workflow_run` trigger), applying pending migrations
   to the linked Supabase project via `supabase db push --linked`.
3. Vercel's own GitHub integration deploys the app to Production
   independently, triggered by the same push to `main`.

**Known ordering caveat:** steps 2 and 3 are not strictly sequenced
against each other — Vercel's deploy is not gated on the migration
deploy finishing first. In practice this is safe as long as every
migration is additive/backward-compatible (the existing migrations all
are: new tables, new nullable columns, new check constraints on new
columns). If a future migration is ever breaking (e.g. renaming or
dropping a column the current app reads), sequence it as two migrations
across two releases (deprecate-then-remove), or disable Vercel's
automatic git deploy and trigger it via a Vercel Deploy Hook as an
explicit step after the migration deploy succeeds.

### 5.3 Verification checklist (post-deploy)

- [ ] `CI` workflow shows green on the merge commit (confirm in the
      Actions tab — do not assume from a local run)
- [ ] `Deploy Supabase Migrations` workflow shows green and its "Verify
      migrations (dry run)" step logged no unexpected diff
- [ ] New/changed tables visible in Supabase Studio's Table Editor for
      the target project
- [ ] A fresh sign-up completes onboarding, including all 4 legal
      checkboxes, and lands on `/dashboard`
- [ ] `legal_acceptances` has 4 new rows for that test user
- [ ] `user_preferences` has exactly 1 row for that test user, with
      documented defaults
- [ ] Manually setting `deleted_at` on a test user's profile row (via
      Supabase Studio) causes their next request to sign them out and
      redirect to `/sign-in?notice=account_deactivated`
