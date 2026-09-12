# ADR-003: Cookie Onboarding (and Legal Re-Acceptance) Optimization

## Status
Accepted

## Context
`middleware.ts` runs on every request to a protected route and needs to
decide whether a signed-in user must be redirected to `/onboarding`
(hasn't finished it yet) or, as of this hardening pass, to
`/legal/re-accept` (a required legal document has a newer published
version than what they last accepted — Change #1). The authoritative
answer for both requires a database read (`profiles.onboarding_completed_at`,
and a join across `legal_acceptances`/`legal_documents` for the legal
check). Doing that on literally every request, in Edge middleware, adds
latency to every single page load for the overwhelming majority of
requests where the answer is "yes, already done" and never changes
again for that user (onboarding) or changes only when an operator
publishes a new document version (legal — rare).

## Decision
Use a signed, httpOnly cookie as a fast-path hint, not a source of
truth:
- `va_onboarding_done=1`, set once by `/api/onboarding/complete` on
  success, with a long (1-year) `maxAge` — once true, "has this user
  ever finished onboarding" never becomes false again in this system.
- `va_legal_current=1`, set by both `/api/onboarding/complete` (which
  just recorded acceptance of everything currently required) and
  `/api/legal/re-accept`, with a deliberately short (24-hour) `maxAge`.
  Unlike onboarding, "is this user's legal acceptance current" *can*
  become false again later — an operator can publish a new document
  version at any time — so this cookie is a freshness bound, not a
  permanent flag: it caps how long a stale "current" cookie can keep
  middleware from re-checking, rather than asserting the user is
  current forever.

Middleware checks the cookie only. Absence of the cookie triggers a
redirect to the relevant page (`/onboarding` or `/legal/re-accept`),
and **that page re-derives the real answer from the database** before
doing anything else — if the DB says the user is actually already
compliant (e.g. cookie was cleared by the browser, or missing after a
migration that introduces a new requirement for the first time), the
page immediately repairs the cookie and redirects onward rather than
making the user redo anything.

This means the cookie can be wrong in the "makes middleware do one
extra redirect" direction, but can never be wrong in the "lets someone
skip a required step" direction — the gated pages are the actual
enforcement point, the cookie only decides whether middleware sends you
there.

## Consequences
- The common case (fully onboarded, fully legally current user hitting
  any protected route) costs one cookie read in Edge middleware, no
  database round trip.
- A cleared/missing cookie costs exactly one extra redirect + one DB
  read on the gated page, then the cookie is repaired — this is also
  what happens for every existing user the first time this migration
  ships (nobody has `va_legal_current` yet), which is the intended
  mechanism for Change #1's "future legal updates require
  re-acceptance" requirement.
- Publishing a new required legal document version does not force
  re-acceptance instantly for a user whose `va_legal_current` cookie is
  still fresh — it forces it within at most 24 hours (the cookie's
  `maxAge`), the next time that cookie expires and middleware falls
  back to the DB-backed `/legal/re-accept` check. That bounded window
  is an accepted tradeoff against paying a database read on every
  single protected-route request; if a specific rollout ever needs
  same-request enforcement (e.g. a regulator-driven deadline), the
  operational fallback is to shorten `maxAge` further or clear the
  cookie name (bump it to `va_legal_current_v2`) at publish time,
  forcing every session to recheck immediately.
