# VAM — Roadmap (Stage 1 → 7)

> **The ordered delivery plan from where we are today to a public
> launch.** Stages 1–4 are complete; their summary is included so a
> new agent can read this file in isolation. Stages 5–7 are the
> remaining work; they are scoped to a level that lets them be
> picked up and finished by a single agent without re-doing the
> design.
>
> **For what is built today, see
> [`CURRENT-STATE-AUDIT.md`](./CURRENT-STATE-AUDIT.md).**
> **For the product/architecture, see
> [`VAM-UNIFIED-BLUEPRINT.md`](./VAM-UNIFIED-BLUEPRINT.md).**

---

## Stage summary at a glance

| Stage | Title | Status | Evidence |
| --- | --- | --- | --- |
| 1 | Foundation (auth, DB, UI shell) | DONE | All migrations 0001-0025 applied; `(auth)` + `(app)` route groups build and pass middleware |
| 2 | Mentor + chat (Groq, matching) | DONE | `src/lib/mentor/*`, `src/lib/groq/*`, `/api/chat` streams + persists; 7 mentor-matching + 13 prompt-assembly tests |
| 3 | Onboarding + assessments + journeys | DONE | 5-step onboarding, 2 seeded journeys, scoring, action-plan generation |
| 4 | Voice + 30-day program + soft delete | DONE | `/api/voice/{stt,tts}`, `src/lib/voice/*`, 30-day program content in migration 0027, soft-delete + restore + 30-day purge cron |
| 5 | **Soft launch** | **NEXT** | See below |
| 6 | **Polish** | **TBD** | See below |
| 7 | **Public launch** | **TBD** | See below |

---

## Stage 1 — Foundation (DONE)

- Next.js 14 App Router + TypeScript strict + Tailwind.
- Supabase (Postgres + Auth + Storage), RLS on every user table.
- `(auth)` + `(app)` route groups, middleware auth gate.
- `va_onboarding_done` and `va_legal_current` cookies (ADR-003)
  so middleware does not need a DB round trip on every nav.
- CI: `ci.yml` runs lint + typecheck + unit tests on every PR,
  plus the `verify-migrations` job that boots a real
  `supabase start`.

## Stage 2 — Mentor + chat (DONE)

- 4 mentor personas + 4 mentor candidates seeded.
- Deterministic mentor matching with persona-as-constraint.
- Streaming chat via raw `fetch` to Groq (no SDK).
- Chat persistence writes both the user message and the
  mentor reply to `messages`.
- Memory extraction runs on every mentor reply; retrieved
  memories are prepended to the next prompt.

## Stage 3 — Onboarding + assessments + journeys (DONE)

- 5-step onboarding (welcome, profile, persona, goal, legal).
- 12 versioned legal documents, 4 re-accept gate.
- 2 seeded journeys, 1 assessment per journey, deterministic
  scoring, 12-week action plan from the active goal.
- Mentor chat + voice unlock at the end of onboarding.

## Stage 4 — Voice + 30-day program + soft delete (DONE)

- Voice end-to-end: STT (Groq Whisper), VAD (RMS threshold),
  TTS (Groq PlayAI), sentence chunking, playback queue.
- 30-day program: 30 ordered days per journey, day resolver,
  `journey_progress` table, `/api/journeys/advance` is the
  only writer.
- Soft delete: `profiles.deleted_at` + 30-day window +
  `/api/internal/purge-deleted-accounts` Vercel cron.
- The audit (see
  [`CURRENT-STATE-AUDIT.md`](./CURRENT-STATE-AUDIT.md))
  added a middleware-level soft-delete redirect so users do
  not see a flash of `/dashboard` before the API layer
  bounces them.

---

## Stage 5 — Soft launch (NEXT)

**Goal:** A live, working VAM at a private URL that a small
group of friendly users can use daily, and that the team can
demo without embarrassment.

**Definition of done:**

- `https://staging.vam.app` resolves, has a working landing
  page, and a complete sign-up → onboarding → mentor chat loop.
- A daily user can sign in, see today's program day, talk to
  the mentor by voice, complete the day, and see the streak
  update.
- The team has run the staging-readiness checklist
  (`docs/STAGING-READINESS.md`) end to end on the staging
  environment.
- No `console.error` on a normal day-1 user flow.

### Stage 5 work

5.1 **Wire staging environment** (1-2 days)

- Create the staging Supabase project, link it, run
  `supabase db push --linked`.
- Set every env var from `.env.example` in the Vercel
  **preview** environment, including `INTERNAL_CRON_SECRET`.
- Add `vercel.json` cron schedule
  (`0 6 * * *` -> `/api/internal/purge-deleted-accounts`,
  with `Authorization: Bearer ${INTERNAL_CRON_SECRET}`).
- Smoke test: sign up, complete onboarding, send a chat
  message, complete a journey day, verify the row in
  `journey_progress`.

5.2 **Email templates** (1 day)

- In the staging Supabase dashboard, configure the auth
  email templates: sign-up confirmation, password recovery,
  magic link, email change. The redirects are already in
  `.env.example`; only the template text needs to be
  written.
- The templates must use the VAM voice (warm, second person,
  no exclamation marks).

5.3 **Supabase Storage** (0.5 day)

- Create the `voice-sessions` bucket (private) and a
  `voice-session-audio/` path. The route handler that records
  the voice session metadata already exists; only the upload
  step is missing.
- Verify that the storage RLS policy is user-scoped
  (`auth.uid()::text = (storage.foldername(name))[1]`).

5.4 **Observability — minimum** (1 day)

- Wire Sentry for the Next.js app (server + client).
- Add `console.error` -> Vercel log drain (free with
  Vercel) so anything that escapes Sentry still lands in
  one place.
- Add a `request_id` to every API response and to every
  error log so a user-reported error can be located in 30
  seconds.

5.5 **Settings — delete-account flow** (0.5 day)

- `/settings/profile` already has a "Delete account" button
  that calls `/api/account/delete`. Verify the flow:
  soft-delete sets `deleted_at`, middleware redirects to
  `/account/restore`, the restore page calls
  `/api/account/restore`, the 30-day cron hard-deletes.
- Add a copy review pass on the confirm dialog and the
  restore page.

5.6 **Settings — collective-intelligence opt-in** (0.5 day)

- Add a toggle on `/settings/profile` that calls
  `/api/collective-intelligence/consent` and reflects the
  current `profiles.collective_intelligence_opt_in` value.
- Document the toggle on `/legal/ai-consent` and on the
  privacy preferences page.

5.7 **Admin page — collective insights** (1 day)

- The API exists. Build the page: a per-journey aggregate
  card (N completions, mean time to complete), the
  mentor-affinity matrix, and a "view raw" link that
  downloads the JSON. RLS-gated to admins via
  `verifyAdmin`.

5.8 **Mentor rematch UI** (0.5 day)

- Add a "Try a different mentor" button on the mentor
  page (collapsed behind a small "..." menu). Calls
  `/api/mentor/rematch`, updates the displayed avatar +
  name, and writes a `mentor_rematch_log` row.

5.9 **Memory consolidation cron** (1 day)

- Wire `src/lib/memory/consolidation.ts` to a nightly
  Vercel cron (`0 3 * * *`). It should:
  - merge near-duplicate memory entries (cosine > 0.92
    on a future embedding; today, Jaccard on the bag of
    words > 0.8),
  - drop entries older than 180 days with a recency
    score below threshold,
  - re-score all remaining entries.
- Add a route handler `/api/internal/memory-consolidate`
  guarded by `INTERNAL_CRON_SECRET`.

5.10 **Staging-readiness checklist** (1 day)

- Walk through `docs/STAGING-READINESS.md` end to end on
  the staging environment. Document anything that needs
  adjusting; merge the adjustments as a single PR.

**Total Stage 5 effort: ~7-9 days of one engineer.** No
schema changes; mostly wiring and a few small pages.

### Stage 5 exit criteria

- [ ] Staging URL is live and the full day-1 user flow
      works.
- [ ] Sentry receives errors from both server and client.
- [ ] `vercel.json` has both the purge-deleted-accounts
      and the memory-consolidation crons, both authenticated.
- [ ] All gaps from
      [`CURRENT-STATE-AUDIT.md`](./CURRENT-STATE-AUDIT.md)
      section 5 are addressed **or** explicitly deferred
      to Stage 6 with a written rationale.

---

## Stage 6 — Polish (TBD)

**Goal:** VAM is ready for public marketing. Every screen is
fast, accessible, observable, and resilient under load.

**Definition of done:**

- A new user can complete onboarding in under 4 minutes on a
  mid-tier Android phone, on a 3G connection.
- The mentor responds to a voice message in under 4 seconds
  p50, under 8 seconds p95.
- All Vercel + Supabase dashboards are clean (no errors,
  no slow queries, no warnings) over a 24-hour sample.
- A blind accessibility audit finds zero P0/P1 issues.

### Stage 6 work

6.1 **Rate limiting** (1-2 days)

- Per-user limiter on `/api/chat`, `/api/voice/*`,
  `/api/assessments/submit`, `/api/mentor/rematch`.
  Thresholds: 60 chat messages / hour, 100 voice
  conversions / hour, 5 assessments / day, 3 rematches /
  day. Implementation: a thin in-memory limiter with a
  Redis fallback for the production deploy (or a Vercel KV
  table if you want to stay on Vercel primitives).
- 429 responses with a `Retry-After` header and a
  human-readable `message`.

6.2 **Performance pass** (3-5 days)

- Lighthouse on every page; target 90+ on every category.
- Server components for every page that does not need
  interactivity; this is mostly done, audit and fix
  stragglers.
- `next/image` for every image; `next/font` for every
  custom font; remove any `import` of `node-fetch` or
  `node:crypto` from client bundles.
- Add a `loading.tsx` for every `(app)` segment so
  navigations feel instant.
- Add a `Suspense` boundary around the chat message list
  so streaming replies do not block the rest of the page.
- Move the mentor prompt assembly to a worker (Vercel
  Edge Function or Background Function) if the p95
  exceeds 200 ms; this is unlikely to be needed but is in
  the playbook.

6.3 **Accessibility audit** (2-3 days)

- Run `axe-core` against every page in CI; fail the build
  on any P0/P1.
- Manual screen-reader pass on the mentor chat and
  onboarding flows (NVDA on Windows, VoiceOver on macOS,
  TalkBack on Android).
- Verify focus order, focus visibility, color contrast in
  both themes and all four persona accent colors.
- Add a "Skip to main content" link to the layout.

6.4 **End-to-end tests** (3-4 days)

- Playwright suite that exercises the day-1 user flow
  (sign up, onboarding, first chat, first journey day).
  Run on every PR; gate `main` on green.
- Visual regression snapshots for the four persona themes
  (light + dark = 8 snapshots total) and for the mentor
  chat in three states (loading, streaming, idle).

6.5 **Observability — full** (2 days)

- Add Vercel Analytics + Speed Insights.
- Add a Sentry alert rule for each of: chat error rate
  > 1%, voice STT p95 > 8s, voice TTS p95 > 6s, any 5xx
  on `/api/internal/*`.
- Add a nightly synthetic check (Vercel
  `synthetic-monitoring` or a tiny `node-cron` script) that
  hits `/api/health` (new, see 6.6) every 5 minutes and
  pages on failure.

6.6 **`/api/health` and liveness** (0.5 day)

- Returns the Supabase + Groq round-trip latency and the
  current memory count. Used by the synthetic check above
  and by the Vercel deployment health check.

6.7 **i18n groundwork** (1 day)

- Pick the i18n library (`next-intl` is the current
  favorite). Wrap every user-facing string in the
  scaffolding. Do not translate anything yet, but make
  every screen translatable in a single PR.

### Stage 6 exit criteria

- [ ] Lighthouse 90+ on every page.
- [ ] Zero axe-core P0/P1 issues.
- [ ] Playwright day-1 flow is green on CI.
- [ ] All Sentry alerts are configured and tested.
- [ ] Every user-facing string is wrapped in the i18n
      scaffolding.

---

## Stage 7 — Public launch (TBD)

**Goal:** VAM is on the public marketing site, accepting new
users, and the team can sleep through the night.

**Definition of done:**

- `https://vam.app` is live, the marketing landing is
  polished, and the sign-up funnel is instrumented end to
  end.
- A new user can sign up with email or Google, complete
  onboarding, and have their first mentor conversation in
  under 5 minutes.
- The team has run a 7-day soft launch with at least 50
  real users and a >40% Day-7 retention.
- All regulatory, security, and reliability requirements
  below are met.

### Stage 7 work

7.1 **Marketing site** (3-5 days)

- A real landing page (the current `src/app/page.tsx` is
  a placeholder). Hero, three benefit blocks, a one-minute
  product video, a "How it works" 3-step, a "What people
  say" (use real soft-launch quotes), a pricing block (see
  7.2), and a footer with the legal links.
- Build with the same component library; do not introduce
  a new stack.

7.2 **Pricing and billing** (3-5 days)

- Pick a billing provider (Stripe is the default).
- Three tiers: Free (limited to one journey + text chat),
  Pro (unlimited journeys + voice + action plans), Pro
  Annual (Pro + 17% discount).
- Webhook -> Supabase: `profiles.subscription_tier`,
  `profiles.subscription_renews_at`, `profiles.stripe_customer_id`.
- Gate the voice and action-plan routes on tier.
- Add a `/settings/billing` page.

7.3 **Security audit and pen test** (5-7 days)

- Engage a third party (or a senior internal reviewer)
  for an OWASP top-10 pass.
- Specifically review: the admin client usage, the
  service-role key handling, the rate limiter, the cron
  auth, the legal acceptance audit trail, the export
  route, and the OAuth callback.
- Resolve every P0/P1 before launch.

7.4 **GDPR / CCPA final review** (1-2 days)

- Verify the data export is complete (a spot-check from a
  test account).
- Verify the hard-delete cron deletes every user-derived
  row (profile, messages, memories, assessments, action
  plans, voice sessions, legal acceptances, consents).
- Verify the cookie banner and the privacy preferences
  page surface every category of cookie actually used by
  the app.

7.5 **Reliability** (2-3 days)

- Multi-region Supabase is not on the table for Stage 7;
  document the single-region risk in the runbook.
- Vercel: enable "Fluid Compute" if available; configure
  the regional edge for the routes that benefit (the
  static `/legal/*` pages, the marketing site).
- Add a runbook at `docs/RUNBOOK.md` covering: Supabase
  outage, Groq outage, Vercel outage, leaked
  `INTERNAL_CRON_SECRET`, leaked
  `SUPABASE_SERVICE_ROLE_KEY`.

7.6 **Launch comms and support** (2 days)

- A support email (`support@vam.app`) with a Gmail
  forwarder to start; move to HelpScout or Intercom if
  volume justifies it.
- A public status page (`status.vam.app`) backed by the
  same `/api/health` route.
- A one-page launch announcement that links from the
  marketing site.

### Stage 7 exit criteria

- [ ] 50 real users have completed a 7-day soft launch
      with >40% Day-7 retention.
- [ ] No P0/P1 from the security audit is open.
- [ ] The runbook has been exercised at least once in a
      tabletop drill.
- [ ] Marketing site, billing, and support are all live.

---

## Open questions for the team

- **Mentor avatar audio.** Today the mentor TTS is read by
  whichever PlayAI voice the prompt names. Is the plan to
  record human intros for each mentor ("Hi, I'm Maya...")
  and splice them in? If so, that needs an asset pipeline
  in Stage 5.
- **Custom journeys.** Is the 30-day program authoring
  surface (an admin page that adds a new program) in
  scope for Stage 6 or Stage 7? Today's journey content is
  in a migration, which is fine for the seeded journeys
  but won't scale.
- **Localization.** The 7.1 mention is scaffolding only;
  the actual translation work is post-launch. Confirm
  with the marketing team which language goes first.
- **Mentor persona swap.** The product blueprint locks
  persona once assigned. The settings page does not yet
  let a user swap persona. Confirm whether that is a
  product gap or a deliberate decision.
