# VAM Product Blueprint and Delivery Roadmap

**Status:** living source of truth

**Last reconciled:** 2026-09-08

This document replaces the fragmented implementation status in the legacy
Phase 1 blueprint, README, and stage notes. It records what is in the
repository, what is still incomplete, and the recommended route to a safe
production product. It does not claim that an item is complete simply because
it was designed or mentioned in an earlier document.

## 1. Product definition

VAM (Vocal + Acuity) is a privacy-conscious professional communication
coaching web app. An individual improves their communication through a
persistent AI coach, deliberate exercises, assessment and progress feedback,
and—only with explicit consent—de-identified cohort learning.

The core loop is:

```text
Sign up → establish professional context → practise with a coach
→ receive specific feedback and a next action → complete a programme day
→ measure progress → return with context intact
```

The product's promise is not generic chat. It is structured, measurable
practice toward confidence, executive presence, leadership communication,
meetings, presentations, persuasion, and interviews.

## 2. Product boundaries

### In scope for the individual product

- Email/password and Google authentication, user-owned data, responsive web.
- AI mentor chat, text and push-to-talk voice interaction.
- Durable, user-scoped memory and professional context.
- Goals, action plans, assessments, progress metrics and trends.
- The universal 30-Day Transformation Program.
- Consent-controlled, aggregate-only Collective Intelligence findings.
- Privacy controls, export, deletion, legal acceptance and support operations.

### Explicitly deferred until a later product decision

- Billing, a mentor marketplace, team/group mentoring, enterprise tenancy.
- Native apps, calendar/Slack integrations, fine-tuned models.
- Real-time full-duplex voice and user-to-user live discussions.

Those are not accidental gaps. They require product, privacy, operational,
and commercial design beyond the present single-user product.

## 3. Current implementation baseline

| Domain | Status | Evidence / important gaps |
| --- | --- | --- |
| Identity, sessions, onboarding | Implemented | Supabase Auth, profile trigger, protected routes, professional identity fields. Needs live-environment QA. |
| Privacy and legal acceptance | Implemented foundation | Versioned acceptance ledger and re-acceptance flow exist. Legal copy still has placeholders and requires legal approval. |
| Mentor text chat | Implemented | Streaming Groq chat, mentor assignment, persistence and prompt assembly exist. Requires real-key/evaluation QA. |
| Mentor memory | Implemented baseline | Typed durable memory, extraction, consolidation and relevance ranking exist. No embedding retrieval or background queue yet. |
| Voice | Implemented push-to-talk baseline | STT/TTS and playback support exist. No full-duplex/barge-in guarantee. |
| Goals, action plans, progress | Implemented baseline | Progress snapshots, action plans, streaks and personal insights exist. |
| Assessments | Implemented baseline | Template, response and scoring paths exist. Communication DNA remains incomplete as an explicit, viewable profile. |
| Journeys and curriculum | Implemented baseline | Generic journey infrastructure and the 30-day programme are present in migration 0026. Industry scenarios are still content work. |
| Collective Intelligence | Implemented foundation | Migration 0027 adds consent, a minimum cohort size of 10, aggregate insight records, published insight display and an admin publishing UI. It does **not** yet derive insights automatically. |
| Administration | Partial | Admin membership and collective-insight publishing exist. Legal publishing, support tools, audit log and operational dashboards do not. |
| Account lifecycle | Partial | Export and soft-delete enforcement exist. Deletion request, recovery window and irreversible purge job are not implemented. |
| Test/release engineering | Partial | Typecheck passes. Unit tests are mostly green; Vitest needs explicit Next module mocks. Live integration tests and production monitoring remain absent. |

## 4. Non-negotiable design rules

1. **Supabase is the system of record.** Browser state is never the sole copy
   of user data.
2. **RLS is the default boundary.** Service-role access is server-only,
   authenticated first, authorised second, and explicitly scoped.
3. **No raw personal data enters Collective Intelligence outputs.** A consent
   record alone is not a licence to publish messages, assessment answers,
   identifiers, or narrow cohorts.
4. **AI output is assistance, not fact.** It must be bounded by prompts,
   validated structured outputs where decisions are made, evaluated before
   release, and never treated as medical, legal, HR, or employment advice.
5. **Migrations are forward-only.** Never rewrite an applied migration.
6. **Every release is observable and reversible by a forward fix.** Ship
   additive schema changes, feature flags for risky capabilities, and a
   defined rollback/disable procedure.

## 5. Target architecture

```text
Browser / PWA
  └─ Next.js app shell, user interactions, accessible UI
       ├─ RLS-scoped Supabase client for user-owned reads/writes
       └─ Route handlers for privileged orchestration
            ├─ Supabase Postgres/Auth/Storage (source of truth)
            ├─ AI provider (server-side only)
            └─ asynchronous worker/queue for extraction, scoring and aggregation

Admin console
  └─ explicit admin membership + server-side authorization
       └─ operational actions and reviewed aggregate publication
```

No secret may be shipped to the browser. All tables containing user data need
RLS. Any new service-role route must start with `verifyAuthenticatedUser()`
and then perform role/ownership authorization.

## 6. Stage roadmap

### Stage 0 — Product, compliance and release foundation

**Outcome:** a legally and operationally safe basis for development.

- Finalize product metrics, target users, coaching boundaries and AI safety
  policy.
- Obtain reviewed legal copy, retention policy, privacy notice and consent
  language; replace all placeholder legal dates/text.
- Establish separate development, staging, disposable-test and production
  Supabase projects; configure backups and access control.
- Configure GitHub branch protection, CI secrets, Vercel environments and
  error/uptime monitoring.

**Exit criteria:** named owners approve policy/copy, environments are isolated,
backups and incident contacts are documented, and CI protects `main`.

### Stage 1 — Secure individual foundation

**Outcome:** a user can create and safely manage an individual account.

- Authentication, profile trigger, onboarding, professional identity and RLS.
- Versioned legal acceptance and re-acceptance.
- Preferences, settings, theme, export and account lifecycle.

**Repository status:** mostly built. Finish account deletion/recovery/purge,
legal publishing administration, and live integration tests.

**Exit criteria:** all protected-route, RLS, consent, export and deletion flows
are tested against a disposable Supabase instance; legal text is approved.

### Stage 2 — Coaching loop

**Outcome:** a returning user gets a useful, safe, persistent AI coach.

- Mentor assignment, text streaming, durable conversations, prompt context.
- Typed memory extraction, retrieval, consolidation and user controls.
- A formal evaluation suite for prompt quality, safety, hallucination and
  personalization.

**Repository status:** baseline built. Add async processing, failure/retry
handling, memory transparency/correction controls, model/provider fallback and
evaluation gates.

**Exit criteria:** successful real-key QA, documented response/error behaviour,
and measurable personalization without cross-user data leakage.

### Stage 3 — Deliberate practice and measurement

**Outcome:** coaching becomes a programme with clear actions and measurable
improvement.

- Goals, action plans, assessments, scoring and progress trends.
- Communication DNA as a versioned derived profile, explanation UI and user
  correction path.
- 30-day programme completion, reminders/check-ins and content QA.
- Industry/role-specific scenarios only after curriculum content review.

**Repository status:** goals, assessments, trends and migration 0026 are
present. Communication DNA, automated check-ins and scenario content remain.

**Exit criteria:** a test user can complete 30 days, see reliable trends and
understand/correct what the system has inferred.

### Stage 4 — Voice and experience quality

**Outcome:** voice practice feels trustworthy and accessible.

- Harden the existing push-to-talk path: consent, error/retry UX, latency
  telemetry, accessibility, browser/device matrix and cost controls.
- Add streamed TTS only after measurement demonstrates a benefit.
- Treat full-duplex/barge-in as a separately funded architecture project.

**Repository status:** push-to-talk baseline is present; not live validated.

**Exit criteria:** defined p50/p95 latency and error SLOs, tested fallbacks to
text, and no accidental recording/storage beyond the stated policy.

### Stage 5 — Collective Intelligence and operations

**Outcome:** consented users benefit from cohort learning without exposing
personal information.

- Preserve explicit opt-in/out and audit consent changes.
- Build a scheduled aggregate pipeline over approved metrics only; never raw
  messages or free-form assessment answers by default.
- Enforce cohort suppression (minimum 10, preferably higher for sensitive
  segments), time windows, segment generalization, publication review and
  withdrawal handling.
- Add admin operations: reviewed publishing, legal document versions, support
  tools, audit events, feature controls and data-quality reporting.

**Repository status:** consent, aggregate record schema and manual review/
publication are built in migration 0027 and `/admin`. Automated aggregation,
admin audit logs and operations tooling are not.

**Exit criteria:** privacy review signs off on the aggregation specification;
automated tests prove no raw/low-count output can be published; every admin
mutation has an audit record.

### Stage 6 — Production launch

**Outcome:** a controlled public release with measurable reliability.

- Close all Stage 0–5 exit criteria; run security review and accessibility
  audit.
- Establish alerting, rate limits, abuse reporting, cost budgets, runbooks,
  support process and incident response.
- Launch a small beta, measure activation/retention/outcomes, iterate, then
  promote gradually.

**Exit criteria:** launch checklist is signed, production migration and
rollback drills pass, monitoring is live, and an accountable operator owns
incidents.

### Stage 7+ — Expansion (requires new product decisions)

Only after the individual product proves value: billing, organisations,
team/group coaching, integrations, native apps, marketplace mentors and
real-time discussion features. Each needs a new threat model, tenancy design,
pricing model and success metrics; none should be smuggled into the individual
product as a small feature.

## 7. Handoff protocol for future agents

1. Read this file, `README.md`, all migrations after the last applied remote
   migration, and `docs/adr/` before changing schema/auth/privacy behaviour.
2. Treat `supabase/migrations/` as schema truth; regenerate
   `src/types/database.ts` after applying new migrations to a linked project.
3. Before touching privileged code, search `createAdminClient` and preserve
   the auth-then-authorization rule.
4. Update this document's Current Implementation Baseline and relevant stage
   status in the same change as any material capability.
5. Run typecheck, unit tests, build and relevant live integration tests. Report
   skipped/unverified checks honestly.
6. Do not deploy, alter production data, change legal copy, enable an AI
   provider, or add an administrator without explicit user authority.

## 8. Immediate next work

1. Resolve release-engineering audit findings and make CI green.
2. Apply and test migrations 0026 and 0027 in a disposable Supabase project.
3. Implement account deletion/recovery/purge and privacy controls.
4. Complete Stage 3 Communication DNA/check-in work.
5. Design and implement the Collective Intelligence aggregation worker only
   after a privacy review approves its exact input/output contract.
