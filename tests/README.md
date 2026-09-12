# Testing foundation

Introduced by the CTO Review Foundation Hardening pass (Change #7).
Vitest was already installed but had no config and no tests before this;
this is the first cut, not the full suite — it covers the five
priorities called out in the review, and gives every future feature
(Mentor, Assessments, etc.) a place to add tests that already works.

## Structure

```
tests/
  setup.ts             global setup (loads .env.test if present)
  unit/                pure logic, no network/DB — always run in CI
  integration/          real Postgres/Supabase — skipped unless configured
  README.md            this file
```

## Running

```bash
npm test          # single run (what CI runs)
npm run test:watch
```

Unit tests always run. Integration tests self-skip
(`describe.skipIf(!hasTestEnv)`) unless a disposable test project is
configured — `npm test` passes either way.

## Configuring integration tests

Integration tests hit real Postgres triggers and RLS policies, which
can't be meaningfully mocked. Point them at a **disposable** project —
either a local `supabase start` instance or a dedicated CI test project.
**Never point these at production or a real user database**: every test
creates and hard-deletes real auth users as part of its own cleanup.

Create `.env.test` (already gitignored) in the repo root:

```
TEST_SUPABASE_URL=http://localhost:54321
TEST_SUPABASE_SERVICE_ROLE_KEY=<local anon/service key from `supabase status`>
TEST_SUPABASE_ANON_KEY=<local anon key from `supabase status`>
```

In CI, set the same three as repository secrets pointed at a dedicated
Supabase test project (not the production project used by
`.github/workflows/deploy.yml`), and wire a `test` job into
`.github/workflows/ci.yml` with those secrets in `env:`.

## Priority tests (CTO review)

| # | Area                          | File                                                    |
|---|-------------------------------|----------------------------------------------------------|
| 1 | Profile creation trigger      | `integration/profile-creation-trigger.test.ts`           |
| 2 | RLS behavior                  | `integration/rls-policies.test.ts`                       |
| 3 | Onboarding completion flow    | `integration/onboarding-completion.test.ts`              |
| 4 | Legal acceptance recording    | `integration/legal-acceptance-recording.test.ts`, `unit/legal-required-slugs.test.ts` |
| 5 | Protected route behavior      | `unit/protected-routes.test.ts`                          |
| 6 | `verifyAuthenticatedUser` authorization (incl. soft-delete) | `unit/auth-guard.test.ts` |
| 7 | Legal document version bump forcing re-acceptance | `unit/legal-version-enforcement.test.ts` |

## Stage 2 additions

All pure-logic, no network/DB — added alongside the Mentor/Groq/Memory/
Voice/Progress build:

| Area                          | File                                        |
|-------------------------------|----------------------------------------------|
| Mentor matching engine scoring | `unit/mentor-matching.test.ts`               |
| Groq system prompt assembly    | `unit/groq-prompt-assembly.test.ts`          |
| Memory ranking (importance x recency) | `unit/memory-ranking.test.ts`         |
| Progress day-streak computation | `unit/progress-streak.test.ts`              |

Not covered by automated tests (see `docs/STAGE-2-3-4-NOTES.md` for why):
any real Groq API call, `/api/chat`'s SSE proxying end-to-end, voice
recording/playback (jsdom doesn't implement `MediaRecorder`/`Audio`).

## Next steps (not in this pass)

- Wire a `test` job in `.github/workflows/ci.yml` against a dedicated
  Supabase test project so integration tests actually run in CI instead
  of self-skipping.
- Add a true HTTP-level test for `/api/onboarding/complete` and
  `/api/legal/re-accept` (needs a running Next server, e.g. via
  `next start` + `supertest`, or Playwright for a full browser flow).
- Expand unit coverage as Phase 1B features land.
