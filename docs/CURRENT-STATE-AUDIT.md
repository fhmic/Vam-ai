# VAM — Current State Audit

> **Scope:** end-to-end audit of the VAM Next.js codebase at the moment
> the audit was performed. The build was failing on a static-prerender
> error in `(auth)`; this audit captures every observation, the hot
> fixes that were applied during the audit, and the residual gaps that
> remain for Stages 5–7.
>
> **For what to do next, see [`ROADMAP.md`](./ROADMAP.md).**
> **For the unified product/architecture view, see
> [`VAM-UNIFIED-BLUEPRINT.md`](./VAM-UNIFIED-BLUEPRINT.md).**

---

## 1. Build status

| Check | Before audit | After audit hot-fixes |
| --- | --- | --- |
| `npm run build` (empty env) | **FAIL** - `Generating static pages (23/47)`, error `stream did not contain valid UTF-8` reading `src/app/(auth)/sign-up/sign-up-form.tsx` | **PASS** - `Compiled successfully`, 47/47 static pages generated |
| `npm run typecheck` | PASS | PASS |
| `npm run lint` | PASS | PASS |
| `npm test` | 108 passed / 6 skipped (18 files) | 111 passed / 6 skipped (18 files) - added 3 soft-delete middleware cases |

Notes on the sandbox:

- `next build` prints `Failed to patch lockfile, please try
  uninstalling and reinstalling next in this workspace` and an
  `ECONNRESET` / `SSL alert 47` because Next's internal
  `patch-incorrect-lockfile` utility tries to phone the npm registry.
  These messages are **not** from the VAM codebase; the build still
  completes successfully. They will not appear in CI when the registry
  is reachable.

---

## 2. The build failure and its root cause

### What was failing

`next build` aborted during the static-prerender pass with:

```
./src/app/(auth)/sign-up/sign-up-form.tsx
Error: Failed to read source code from .../sign-up/sign-up-form.tsx
Caused by: stream did not contain valid UTF-8
```

The same shape of error applied to every other `(auth)` page once the
file pointed at the broken one was fixed: `sign-in`, `reset-password`,
`update-password`.

### Why

The `(auth)` pages were written as single-file `"use client"`
components that instantiate the Supabase browser client at module
top-level:

```ts
"use client";
...
const supabase = createClient(); // <-- runs once when the module is evaluated
```

Next's App Router still evaluates client components once during the
**static prerender pass** for the page that imports them. When
`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are
unset (CI, fresh checkout, sandboxed environment),
`@supabase/ssr`'s `createBrowserClient` throws inside the
`getAll`/`setAll` cookie adapter, the file fails to parse from a
byte-pipeline perspective (`stream did not contain valid UTF-8`
was a downstream effect of the file having a `U+FFFD` replacement
character introduced by an earlier shell round-trip), and the build
aborts.

### The fix pattern (applied to all four `(auth)` pages)

1. Convert the page to a **server component**.
2. Add `export const dynamic = "force-dynamic"`. This directive is
   **silently ignored on client components**, which is why the page
   must be a server component - that is the only shape in which
   Next actually skips prerendering.
3. Move the `"use client"` form into a sibling `*-form.tsx` file
   and import it. The form still calls `createClient()` at module
   top-level, but it is now only evaluated on a real request, never
   during prerender.

Pages and the new sibling form files:

| Page (server, `force-dynamic`) | Client form |
| --- | --- |
| `src/app/(auth)/sign-in/page.tsx` (already server-wrapped, export added) | `src/app/(auth)/sign-in/sign-in-form.tsx` (already existed) |
| `src/app/(auth)/sign-up/page.tsx` | `src/app/(auth)/sign-up/sign-up-form.tsx` (new) |
| `src/app/(auth)/reset-password/page.tsx` | `src/app/(auth)/reset-password/reset-password-form.tsx` (new) |
| `src/app/(auth)/update-password/page.tsx` | `src/app/(auth)/update-password/update-password-form.tsx` (new) |

### Why not just gate `createClient()` inside the component?

That would also work for the build, but it is more invasive and
hides the structural fact: these are auth pages that **always** need
the browser to be present (cookies, `window.location.origin`, OAuth
redirects). The page being server-rendered with `force-dynamic` is
the more honest shape.


---

## 3. Other hot fixes applied during the audit

### 3.1 Soft-delete redirect in middleware

**Before:** `middleware.ts` only knew about the Supabase **auth**
session, not the application-level `deleted_at` flag on `profiles`.
A user who had requested account deletion (and was now in the
30-day recovery window) still had a valid auth session and could
hit `/dashboard`, `/onboarding`, and every API route, with the
only protection being the `verifyAuthenticatedUser` guard in
**some** API routes.

**After:**

- `updateSession` in `src/lib/supabase/middleware.ts` now also
  reads `profiles.deleted_at` and returns `{ ..., softDeleted }`.
- The middleware redirects soft-deleted users to
  `/account/restore` before any other route logic runs (which
  means it also wins over the onboarding and legal-re-accept
  gates, otherwise a soft-deleted user could land in
  `/onboarding` and re-complete it).
- `/account/restore` itself is exempt so the user can either
  restore or sign out.
- Three new unit tests in `tests/unit/protected-routes.test.ts`
  cover the redirect, the onboarding-precedence case, and the
  restore-route exemption.

The API-layer `verifyAuthenticatedUser` guard (which has its own
`auth-guard.test.ts` coverage) remains the authoritative check;
the middleware check is a fast-path for the most common case so
users do not see a flash of `/dashboard` before being bounced.

### 3.2 `vam@file:` self-dependency removed

`package.json` listed `vam: "file:"` as a dependency on itself. The
folder is also physically present in `node_modules/vam/`. **No
code in the project imports it.** This was almost certainly a
mistake from a workspace experiment. The `vam` entry was removed
from `dependencies`; the folder can be deleted with
`rm -rf node_modules/vam` (or `Remove-Item` on Windows) once the
project is reinstalled.

### 3.3 `db:types` script made robust

**Before:** `npm run db:types` ran
`supabase gen types typescript --linked > src/types/database.ts`.
This fails noisily on a fresh checkout before
`supabase link` has ever been run.

**After:** `npm run db:types` invokes `scripts/db-types.mjs`,
which:

1. Probes for `supabase/.temp/project-ref` (the file `supabase
   link` writes).
2. If present, runs `supabase gen types typescript --linked`.
3. If absent, runs `supabase gen types typescript --local` (this
   in turn requires Docker / Podman and a running `supabase
   start`, with a clear error if neither is available).
4. Writes the captured stdout to `src/types/database.ts` in both
   cases (the old `> file` shell redirect was lost when the
   script was moved into Node).

`npm run db:types:linked` and `npm run db:types:local` remain
available for explicit-mode use.

### 3.4 `INTERNAL_CRON_SECRET` is already wired

`src/app/api/internal/purge-deleted-accounts/route.ts` already
verifies the secret with `timingSafeEqual` on the
`Authorization: Bearer ...` header before touching the admin
client, and `vercel.json` schedules the cron
(`0 6 * * *`). `.env.example` documents the variable. No further
work needed.

---

## 4. What is built (Stage 1–4 + a 30-day program + voice)

### 4.1 Pages — 28 routes (47 total incl. API)

| Route | File | Notes |
| --- | --- | --- |
| `/` | `src/app/page.tsx` | Marketing landing |
| `/sign-in` | `src/app/(auth)/sign-in/page.tsx` | Server wrapper + `SignInForm` |
| `/sign-up` | `src/app/(auth)/sign-up/page.tsx` | Server wrapper + `SignUpForm` |
| `/reset-password` | `src/app/(auth)/reset-password/page.tsx` | Server wrapper + `ResetPasswordForm` |
| `/update-password` | `src/app/(auth)/update-password/page.tsx` | Server wrapper + `UpdatePasswordForm` |
| `/auth/callback` | `src/app/auth/callback/route.ts` | OAuth + recovery callback |
| `/onboarding` | `src/app/(app)/onboarding/page.tsx` | 5-step flow with versioned legal acceptance |
| `/dashboard` | `src/app/(app)/dashboard/page.tsx` | Persona-aware greeting + cards |
| `/mentor` | `src/app/(app)/mentor/page.tsx` | Streaming chat UI with text/voice toggle |
| `/progress` | `src/app/(app)/progress/page.tsx` | Streaks + active goal + 30-day program |
| `/journeys` | `src/app/(app)/journeys/page.tsx` | All journeys + 30-day program day list |
| `/assessments` | `src/app/(app)/assessments/page.tsx` | List + start |
| `/assessments/[slug]` | `src/app/(app)/assessments/[slug]/page.tsx` | Run assessment |
| `/insights` | `src/app/(app)/insights/page.tsx` | User + collective insights |
| `/settings/profile` | `src/app/(app)/settings/profile/page.tsx` | Profile + preferences + delete account |
| `/account/restore` | `src/app/account/restore/page.tsx` | 30-day recovery screen |
| `/legal/re-accept` | `src/app/(app)/legal/re-accept/page.tsx` | Forced re-acceptance gate |
| `/legal/*` (12 routes) | `src/app/(app)/legal/<slug>/page.tsx` | Static legal document text |
| `/admin` | `src/app/(app)/admin/page.tsx` | Admin overview |

### 4.2 API routes — 17 routes

| Route | Auth | What it does |
| --- | --- | --- |
| `/api/onboarding/complete` | session | Records profile, persona, action plan, legal acceptances |
| `/api/chat` | session, not soft-deleted | Streams mentor reply + persists message + extracts memory |
| `/api/chat/greet` | session, not soft-deleted | Returns the mentor's greeting line |
| `/api/voice/stt` | session, not soft-deleted | Speech-to-text via Groq Whisper |
| `/api/voice/tts` | session, not soft-deleted | Text-to-speech via Groq PlayAI |
| `/api/assessments/submit` | session, not soft-deleted | Scores + stores assessment + advances journey |
| `/api/action-plans/generate` | session, not soft-deleted | Generates a 12-week action plan |
| `/api/journeys/advance` | session, not soft-deleted | Advances journey day / unlocks next |
| `/api/mentor/rematch` | session, not soft-deleted | Reruns matching + re-assigns mentor |
| `/api/legal/re-accept` | session | Re-records legal acceptances + bumps version |
| `/api/collective-intelligence/consent` | session, not soft-deleted | Toggles shared-learning opt-in |
| `/api/admin/collective-insights` | admin | Aggregated insights view |
| `/api/export` | session, not soft-deleted | Exports the user's data |
| `/api/account/delete` | session, not soft-deleted | Soft-delete (30-day window) |
| `/api/account/restore` | session (allow soft-deleted) | Restores within window |
| `/api/internal/purge-deleted-accounts` | `INTERNAL_CRON_SECRET` | Hard-deletes after 30 days (Vercel cron) |
| `/auth/callback` | OAuth code | Exchanges code for session |

`session, not soft-deleted` = goes through
`verifyAuthenticatedUser` in `src/lib/supabase/auth-guard.ts`,
which checks both the Supabase session and
`profiles.deleted_at`.

### 4.3 Libraries

| Path | What it does |
| --- | --- |
| `src/lib/supabase/{client,server,admin,middleware,auth-guard,auth-callback}.ts` | Four Supabase clients (browser, server, service-role, Edge-friendly) + a single authorization choke point + auth-callback helpers. ADR-002 codifies the service-role isolation. |
| `src/lib/mentor/{matching,assignment}.ts` | Stage 2 mentor assignment: scores 4 mentor candidates against the onboarding profile, deterministic tie-breaks, "locked in once assigned". |
| `src/lib/groq/{client,prompts}.ts` | Thin `fetch` wrapper over Groq's OpenAI-compatible chat API + the three prompt templates (chat, memory extraction, next-action). Streaming + JSON response format. |
| `src/lib/memory/{extraction,retrieval,consolidation}.ts` | Write-time memory extraction, query-time retrieval, and a future cron for consolidation. |
| `src/lib/voice/{provider,sentence-chunker,tts-playback-queue,vad}.ts` | Groq STT/TTS client, sentence-aware chunker for TTS playback, TTS queue, browser VAD utility. |
| `src/lib/assessments/scoring.ts` | Deterministic scoring rules for each assessment. |
| `src/lib/action-plans/suggest.ts` | Generates a 12-week plan from the active goal. |
| `src/lib/recommendations/next-action.ts` | "What's next" suggestion logic. |
| `src/lib/progress/activity.ts` | Streak + activity aggregation. |
| `src/lib/legal/{acceptance,routes,required-slugs}.ts` | Versioned legal acceptance + re-accept gate. |
| `src/lib/analytics/aggregate.ts` | Per-user + collective aggregations. |
| `src/lib/avatar/registry.ts` | Persona -> avatar asset map. |
| `src/lib/theme/resolve.ts` | Light/dark + persona color resolution. |
| `src/lib/admin/access.ts` | Admin role check. |
| `src/lib/coaching/frameworks.ts` | Coaching framework picker. |
| `src/lib/journeys/current-program-day.ts` | Day-of-program resolver. |
| `src/lib/onboarding/constants.ts` | Onboarding step / schema constants. |
| `src/lib/chat/{persist-reply,prompt-context}.ts` | Reply persistence + prompt context builder. |

### 4.4 Database

`supabase/migrations/` (read top-down; each is forward-only):

- 0001-init: profiles, mentors, personas, memory, messages,
  legal tables, RLS, profile-creation trigger.
- 0002 to 0025: incremental additions (assessments, journeys,
  goals, action plans, streaks, voice sessions, collective
  intelligence, admin, etc.).
- 0026: post-Phase-1A hardening - `profiles.deleted_at`,
  `profiles.preferences`, `legal_documents` versioning,
  `legal_acceptances`, `user_consents`. See
  `docs/PHASE-1A-FOUNDATION-HARDENING.md`.
- 0027: 30-day program content + journey day count.

`supabase/seed.sql` seeds:

- 4 mentor personas + 4 mentor candidates (with bios, tones,
  specialties, model preferences).
- 12 legal documents (one per `legal_required_slugs`).
- 2 journeys (`anxiety-foundations`, `confidence-foundations`).
- The 30-day program content.
- The action-plan and assessment fixtures used by tests.

`src/types/database.ts` is the generated `Database` interface; it
is regenerated with `npm run db:types` (now with the
local-fallback wrapper, see section 3.3).

### 4.5 Tests — 111 passing, 6 skipped (114 total)

| File | What it covers |
| --- | --- |
| `tests/unit/auth-guard.test.ts` | Soft-delete + session rejection in `verifyAuthenticatedUser` |
| `tests/unit/auth-callback.test.ts` | OAuth + recovery callback handling |
| `tests/unit/protected-routes.test.ts` | Middleware routing: unauth, sign-in redirect, onboarding gate, legal gate, soft-delete redirect |
| `tests/unit/onboarding-schema.test.ts` | Onboarding Zod schemas |
| `tests/unit/mentor-matching.test.ts` | Mentor matching scoring + tie-breaks |
| `tests/unit/groq-prompt-assembly.test.ts` | Chat/memory/next-action prompt assembly |
| `tests/unit/memory-ranking.test.ts` | Memory retrieval ranking |
| `tests/unit/sentence-chunker.test.ts` | TTS sentence chunking |
| `tests/unit/vad.test.ts` | VAD utility |
| `tests/unit/analytics-aggregate.test.ts` | Per-user + collective aggregations |
| `tests/unit/avatar-shuffle.test.ts` | Persona avatar deterministic selection |
| `tests/unit/legal-version-enforcement.test.ts` | Legal re-acceptance gate |
| `tests/unit/legal-required-slugs.test.ts` | Required slugs configuration |
| `tests/unit/coaching-frameworks.test.ts` | Coaching framework picker |
| `tests/unit/progress-streak.test.ts` | Streak math |
| `tests/unit/action-plan-week.test.ts` | 12-week plan generation |
| `tests/unit/next-action.test.ts` | Next-action suggestion |
| `tests/unit/theme.test.ts` | Theme resolution |
| `tests/integration/*` (4 files, 6 cases - currently skipped) | Live Supabase + RLS checks, gated behind `RUN_INTEGRATION=1` |

---

## 5. Documented gaps (residual, not addressed in this audit)

These are real, but they are scope for Stages 5-7 (see
[`ROADMAP.md`](./ROADMAP.md)). Listing them here so nothing slips
through.

1. **Memory consolidation cron.** `lib/memory/consolidation.ts` is
   defined but not wired to `vercel.json`. Until it is, memory
   retrieval scores can drift as old messages dominate.
2. **Collective intelligence opt-in UX.** The API route exists
   and the column exists on `profiles`, but the settings UI does
   not yet expose a toggle.
3. **Mentor rematch history.** `/api/mentor/rematch` works, but
   there is no UI entry point yet.
4. **Admin collective-insights page.** API exists; the page does
   not yet render it.
5. **Email transactional templates.** The Supabase auth templates
   (sign-up confirmation, password recovery) need to be configured
   per-env. `.env.example` lists the redirects; the actual template
   text is whatever Supabase ships with by default.
6. **Rate limiting.** None yet on `/api/chat`, `/api/voice/*`,
   `/api/assessments/submit`. Acceptable for soft launch, needs
   a per-user / per-IP limiter before public marketing.
7. **Observability.** No Sentry / Logflare / OpenTelemetry. The
   Groq client logs errors to `console.error` only.
8. **Accessibility audit.** No automated a11y test (axe / pa11y).
   The UI uses semantic HTML + Tailwind defaults, but it has not
   been tested with a screen reader.
9. **No production-environment smoke test.** Once Vercel + Supabase
   are wired, run the staging-readiness checklist from
   `docs/STAGING-READINESS.md` end-to-end.
