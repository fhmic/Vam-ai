# VA — Phase 1A Final Production Readiness Audit

**Auditor role:** Principal Staff Engineer / Security Architect / Compliance Engineer / QA Lead / DevOps Lead / Solutions Architect
**Scope:** Complete audit of the Phase 1A Foundation Hardening implementation (`github.com/fhmic/va`, `main`, commit `de1bcc5`) before Stage 2 development begins.
**Method:** Direct code inspection of every file changed in the hardening pass, plus execution of lint/typecheck/test/build against the actual repository — not a review of descriptions or comments claiming those checks pass.

---

## Executive Summary

The Foundation Hardening implementation (legal acceptance system, profile
foundation fields, soft delete column, `user_preferences`, admin-client
safety helper, CI/CD workflows, tests, ADRs) is substantially well-built:
the database schema is sound (proper FKs, uniqueness constraints, RLS,
idempotent triggers), the legal-acceptance versioning/re-acceptance
design is genuinely correct and self-healing under failure, and the
`verifyAuthenticatedUser()` pattern is a real, working centralization of
the service-role safety check.

However, one **critical** finding means the codebase's own claim of
"currently passes lint/typecheck/tests/build" was true only as a local
statement, not as an enforced fact: **both GitHub Actions workflow files
were committed to `.github/workflow/` (singular) instead of
`.github/workflows/` (plural), so neither CI nor the automated migration
deployment had ever actually run on GitHub.** This was fixed during this
audit. Two further gaps — soft-deleted accounts were not rejected
anywhere in the app, and none of the 11 legal documents contain real
(non-placeholder) text — were also found and the first was fixed; the
second is a content/legal deliverable, not an engineering one, and is
tracked as a pre-launch blocker below.

All four validation commands (`lint`, `typecheck`, `test`, `build`) were
actually executed against the repository, before and after fixes, with
real output captured in this document (Section: Test Results).

**Final decision: READY FOR STAGE 2** (feature development on Mentor/
Groq/Memory), conditional on the pre-production-launch items in
"Remaining Risks" being tracked and resolved before real users are
onboarded. Stage 2 development does not depend on those items; launching
to real users does.

---

## Findings

### Critical

**C1 — GitHub Actions workflows were never discoverable by GitHub.**
`.github/workflow/ci.yml` and `.github/workflow/deploy.yml` (singular
`workflow`) are not scanned by GitHub Actions, which only reads
`.github/workflows/` (plural). Neither the CI gate nor the automated
Supabase migration deployment had ever executed on a real push or PR.
Notably, `ci.yml`'s own header comment claimed this exact bug had
already been found and fixed — it hadn't; the fix was described but
never actually committed to the correct path. This means every prior
"CI is green" / "tests pass" claim about this repository was based on
local execution only.
**Status: Fixed** — both files moved to `.github/workflows/` in this
audit; see Fixes Implemented.

### High

**H1 — No enforcement anywhere for `profiles.deleted_at`.**
Migration 0009 added the column but, before this audit, nothing in the
application read it. A soft-deleted account could still authenticate,
complete onboarding, and use every protected route and API route
normally — RLS scopes rows by `auth.uid()` only and has no awareness of
`deleted_at`.
**Status: Fixed** — `verifyAuthenticatedUser()` now rejects a
soft-deleted user for every privileged API route, and the `(app)` layout
now force-signs-out and redirects any soft-deleted user attempting to
view a protected page. See Fixes Implemented.

**H2 — Every legal document contains placeholder text.**
All 11 pages under `src/app/legal/` (including all 4 that gate
onboarding — Terms of Service, Privacy Policy, Acceptable Use Policy, AI
Consent) contain literal `[Insert Date]` placeholders. The
*system* (versioning, immutable audit trail, forced re-acceptance) is
sound; the *text* is not real legal content and cannot be shown to a
real user in its current form.
**Status: Not fixed — out of engineering scope.** This requires actual
legal review and sign-off, not a code change. Tracked as a pre-launch
blocker in Remaining Risks and in `docs/STAGING-READINESS.md`, Section 3.

### Medium

**M1 — Onboarding route writes profile state before legal acceptance state, with no transaction.**
In `/api/onboarding/complete`, `profiles.onboarding_completed_at` is set
before `recordLegalAcceptances()` is called. If the latter throws (e.g. a
transient network error) after the former succeeds, a user is left with
`onboarding_completed_at` set but zero `legal_acceptances` rows. Traced
through in detail: this is **not** an exploitable compliance bypass,
because the independent `va_legal_current` middleware gate and
`/legal/re-accept` page re-derive "missing documents" straight from the
database (not from any flag) and would correctly re-prompt this user for
every required document. But it is still an avoidable inconsistent
intermediate state.
**Status: Not fixed — documented, recommended follow-up.** Recommend
either wrapping both writes in a single Postgres function
(`security definer` RPC) called once via the admin client, or reordering
so `recordLegalAcceptances` succeeds before the profile update commits.
Low urgency given the confirmed self-healing safety net, but worth
closing before Stage 2 adds more multi-step server routes that could
repeat the same pattern without the same lucky safety net.

**M2 — Onboarding bundles all four required documents under one checkbox; re-acceptance uses one checkbox per document.**
This is an inconsistency and, for `ai-consent` specifically, a
compliance judgment call this audit is not positioned to make
unilaterally (some jurisdictions/regulatory regimes expect distinct,
explicit consent for AI processing, separate from general
Terms-of-Service acceptance).
**Status: Not fixed — flagged for legal/product decision.** See
`docs/STAGING-READINESS.md`, Section 3.1.

**M3 — Integration tests never actually execute in CI.**
`tests/integration/*.test.ts` (profile creation trigger, RLS policies,
onboarding completion data contract, legal acceptance recording) all
correctly `describe.skipIf(!hasTestEnv)`, and no `TEST_SUPABASE_*`
secrets are configured anywhere in the CI workflow. This means `npm
test` "passing" in CI has only ever exercised unit tests (originally 12,
now 19 after this audit) — the four DB-level integration test files
(6 test cases) have never actually run against a real Postgres instance
in an automated way.
**Status: Not fixed — requires a provisioned disposable Supabase test
project and CI secrets, which this audit cannot create from within the
codebase.** Test code itself was reviewed and is well-constructed
(proper create/cleanup of throwaway auth users, correct assertions).
Tracked in Remaining Risks.

### Low

**L1 — `admin.ts`'s doc comment is slightly stale.**
It still says "every call site must independently verify the caller's
identity/session" without mentioning `verifyAuthenticatedUser()` as the
now-standard mechanism for doing so. Cosmetic; does not affect behavior.
**Status: Not fixed** (documentation-only, deferred as non-blocking).

**L2 — No rate limiting on any route.**
Not urgent at current scope (no expensive routes exist yet), but will
need to land before Groq-backed `/api/chat` ships in Stage 2, per the
Phase 1 blueprint's own Section 14.4.
**Status: Not fixed — pre-existing, correctly out of scope for this audit.**

**L3 — No structured application logging / external log sink.**
Pre-existing, already flagged in the original CTO Review Pack.
**Status: Not fixed — pre-existing, correctly out of scope for this audit.**

---

## Fixes Implemented

| File | Change |
|---|---|
| `.github/workflow/` → `.github/workflows/` | Moved both `ci.yml` and `deploy.yml` to the path GitHub Actions actually scans (C1). Updated `ci.yml`'s header comment, which had falsely claimed this was already fixed. |
| `.github/workflows/ci.yml` | Added a `verify-migrations` job: boots the real local Supabase stack (`supabase start`, which provisions the `auth` schema our migrations depend on) and applies every migration from scratch on every PR, before merge — closing the Phase 5 gap where migration correctness was only checked post-merge, against the live project, by `deploy.yml`. |
| `.github/workflows/deploy.yml` | Added a note clarifying that its `workflow_run` gate now also depends on the new `verify-migrations` job succeeding. |
| `src/lib/supabase/auth-guard.ts` | `verifyAuthenticatedUser()` now additionally rejects any user whose `profiles.deleted_at` is set, with the same 401 shape as "not signed in" (H1). This is the single choke point already used by every privileged route, so the fix applies everywhere at once. |
| `src/app/(app)/layout.tsx` | Now selects `deleted_at` alongside `display_name`; if set, force-signs-out and redirects to `/sign-in?notice=account_deactivated` before rendering anything (H1, page-level counterpart to the API-level fix above). |
| `src/app/(auth)/sign-in/sign-in-form.tsx` | Now reads `?notice=account_deactivated` and `?error=auth_callback_failed` from the URL and displays them via the existing `FormAlert` component. The second of these was a pre-existing latent gap — `auth/callback/route.ts` had been setting `?error=` on failure since before this audit, but the sign-in form never displayed it. |
| `tests/setup.ts` | Added a global `vi.mock("server-only", () => ({}))`. Needed because Vitest runs in plain Node (no webpack), so the real `server-only` package throws on import regardless of context — this was blocking the two new test files below from importing anything that (correctly) imports `server-only`. Does not affect the real Next.js build-time enforcement, which was independently re-verified via `npm run build` after this change. |
| `tests/unit/auth-guard.test.ts` (new) | 4 tests covering `verifyAuthenticatedUser()`: no session, auth error, soft-deleted user, valid user. Directly covers Phase 6 TEST 6 and the H1 fix. |
| `tests/unit/legal-version-enforcement.test.ts` (new) | 3 tests covering `getRequiredLegalDocuments`/`getMissingLegalAcceptances`: latest-version selection, re-acceptance required after a version bump, no re-acceptance required once current. Directly covers Phase 6 TEST 2. |

---

## Security Audit Report (Phase 2)

**Routes/privileged-code-paths audited:**

| Location | Uses admin client? | Auth check before use | Verdict |
|---|---|---|---|
| `src/app/api/onboarding/complete/route.ts` | Yes (`createAdminClient`) | `verifyAuthenticatedUser()`, first line of the handler | Compliant |
| `src/app/api/legal/re-accept/route.ts` | Indirectly, via `recordLegalAcceptances()` | `verifyAuthenticatedUser()`, first line of the handler | Compliant |
| `src/lib/legal/acceptance.ts` (`recordLegalAcceptances`) | Yes (`createAdminClient`) | None *by design* — documented as the caller's responsibility, and both actual callers (above) comply | Compliant (by contract) |
| `src/app/auth/callback/route.ts` | No (uses the RLS-scoped server client only, for `exchangeCodeForSession`) | N/A | Compliant, no privileged access |
| `src/app/(app)/layout.tsx`, `dashboard/page.tsx`, `onboarding/page.tsx`, `settings/profile/page.tsx` | No | Uses `supabase.auth.getUser()` directly (page-level pattern, not the API-route `verifyAuthenticatedUser()` — appropriate since these render pages via `redirect()`, not JSON error responses) | Compliant |

**Non-compliant routes found: zero.** Every privileged (service-role)
code path in the current codebase was already gated correctly. The gap
found (H1) was not "an ungated privileged route" — it was "a gate that
existed but didn't check one specific condition (soft-delete)" —
different failure mode, now closed at the same choke point.

**Grep verification performed:**
```
grep -rn "createAdminClient" src/ --include="*.ts" --include="*.tsx"
grep -rln "SERVICE_ROLE" src/ --include="*.ts" --include="*.tsx"
```
Both searches returned exactly the files listed above — no orphaned or
unexpected service-role usage anywhere else in `src/`.

---

## Database Integrity Audit (Phase 4)

**`legal_acceptances`:**
- FK `user_id → profiles(id) on delete cascade` — correct, no orphaned
  acceptance rows possible after a hard account delete.
- FK `document_id → legal_documents(id)` — correct (no cascade needed;
  `legal_documents` rows are never deleted).
- `unique (user_id, document_id)` — correct, and combined with
  `recordLegalAcceptances`'s `upsert(..., { ignoreDuplicates: true })`,
  a retry can never create a duplicate row or overwrite `accepted_at`/
  `ip_address` of an existing acceptance. Verified by
  `tests/integration/legal-acceptance-recording.test.ts` (currently
  skipped in CI — see M3 — but reviewed and correct).
- Indexes on `user_id` and `document_id` independently — appropriate
  for the two query patterns actually used (`getMissingLegalAcceptances`
  filters by both).

**`user_preferences`:**
- `unique` on `user_id` plus `on delete cascade` from `profiles` —
  correct 1:1 invariant.
- `handle_new_user()` trigger inserts with `on conflict (user_id) do
  nothing` — idempotent, safe against a retried trigger or a manual
  re-run.
- Migration 0010 includes a backfill `insert ... select ... left join
  ... where up.user_id is null` for any profile created before this
  migration existed — correct, no user is left without a preferences
  row regardless of when their account was created.
- No insert/delete RLS policy for `authenticated` — correctly prevents
  a client from creating a second row or deleting their only row.

**General migration hygiene:** all six new/changed migrations (0007–0010,
plus the deploy/CI changes) use `if not exists` / `on conflict do
nothing` patterns consistently, meaning `supabase db push` is safe to
re-run against a partially-applied state — verified by inspection, not
just by convention, since this is exactly what the audit checked line by
line.

---

## Test Results

All commands below were **actually executed** against the repository in
a clean environment (fresh `npm install`, no cached state), both before
and after the fixes in this audit.

### Before fixes (baseline, confirming the claim before touching anything)

```
$ npm run lint
✔ No ESLint warnings or errors

$ npx tsc --noEmit
(no output — zero errors)

$ npx vitest run
Test Files  3 passed | 4 skipped (7)
     Tests  12 passed | 6 skipped (18)

$ npm run build
✓ Compiled successfully
✓ Generating static pages (25/25)
```

Baseline confirmed accurate for everything it claimed to check locally.
It did not (and could not, from inside the repo alone) reveal that these
checks had never actually run as GitHub Actions CI — that required
inspecting `.github/` directory structure directly, which surfaced C1.

### After fixes

```
$ npm run lint
✔ No ESLint warnings or errors

$ npx tsc --noEmit
(no output — zero errors)

$ npx vitest run
Test Files  5 passed | 4 skipped (9)
     Tests  19 passed | 6 skipped (25)

$ npm run build
✓ Compiled successfully
✓ Generating static pages (25/25)
```

Test count increased from 18 (12 run, 6 skipped) to 25 (19 run, 6
skipped) — the 7 new passing tests are the two new files described in
Fixes Implemented. The 6 skipped tests are the pre-existing DB
integration tests (M3) — still correctly skip-guarded, still not
exercised by this audit, since doing so would require provisioning a
live disposable Supabase project, which is outside what a code audit can
create.

**Not independently re-verifiable by this audit:** the new
`verify-migrations` CI job (`supabase start` against a real local
Supabase stack) was authored and its YAML syntax validated
(`python3 -c "import yaml; yaml.safe_load(...)"` — passed), but could
not be executed end-to-end in this sandboxed environment, which has no
Docker daemon available. This should be confirmed by watching it run
green on the actual PR in GitHub Actions before relying on it as an
enforced gate.

---

## Remaining Risks

Explicitly deferred, not silently dropped:

1. **Legal document text is entirely placeholder content (H2).** Hard
   blocker for onboarding any real (non-team) user. Not an engineering
   task — requires legal counsel.
2. **Branch protection on `main` was not (and could not be) verified or
   configured by this audit** — it's a GitHub repository setting, not a
   file in the repo. Confirm `CI / build` and `CI / verify-migrations`
   are both required status checks before merging is allowed.
3. **Integration tests (M3) still don't run automatically anywhere.**
   Requires provisioning a disposable Supabase test project and adding
   `TEST_SUPABASE_URL` / `TEST_SUPABASE_SERVICE_ROLE_KEY` /
   `TEST_SUPABASE_ANON_KEY` as CI secrets, then wiring a step into
   `ci.yml` that sets them for the test job.
4. **Onboarding route's two-write ordering (M1)** is not atomic. Low
   urgency given the confirmed self-healing re-accept safety net, but
   should be fixed properly (single RPC or reordered writes) before
   Stage 2 adds more multi-step privileged routes following the same
   pattern.
5. **Onboarding vs. re-accept consent UX inconsistency (M2)** — needs a
   legal/product decision, not an engineering one.
6. **No rate limiting (L2) and no structured logging (L3)** — both
   pre-existing, both correctly scoped to land before Groq-backed
   endpoints ship in Stage 2, per the original Phase 1 blueprint.
7. **`verify-migrations` CI job unverified end-to-end** — authored and
   YAML-validated, not executed (no Docker in this audit's sandbox).
   Confirm it runs green in actual GitHub Actions.

---

## Final Decision

## READY FOR STAGE 2

**Justification:** The foundation Stage 2 (Mentor/Groq/Memory) will be
built on — authentication, `profiles`, RLS, the admin-client safety
pattern, and now the legal-enforcement and soft-delete-enforcement
layers — is sound, verified by direct inspection rather than taken on
faith, and now actually enforced by CI going forward (C1 fixed). The one
genuinely critical finding (CI never ran) is fixed and re-verified. The
one high-severity code gap (soft-delete enforcement, H1) is fixed and
covered by a new test. The remaining open items (H2 legal text, M1–M3,
L1–L3) are real but are either explicitly pre-launch/content concerns
that don't block writing Stage 2 feature code, or low-urgency items with
an already-agreed future landing point in the original blueprint.

This verdict covers readiness to **begin Stage 2 development**. It does
**not** constitute sign-off to onboard real, non-team users — that
additionally requires closing item 1 (real legal text) and item 2
(branch protection confirmed) from Remaining Risks at minimum.
