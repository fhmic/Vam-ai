# ADR-004: Legal Acceptance Audit Design

## Status
Accepted

## Context
The prior implementation recorded legal acceptance as a single
`profiles.terms_accepted_at` timestamp. This cannot represent:
multiple distinct documents (terms vs. privacy vs. AI/voice consent are
legally distinct agreements), multiple published versions of the same
document over time, or an immutable audit trail (the column could only
ever hold "the most recent acceptance," overwriting any prior record).
For a product processing voice data and generating AI coaching output,
being able to prove exactly what version of what document a specific
user agreed to, and when, is a real compliance requirement, not
defensive over-engineering.

## Decision
Two tables (migration 0007):

- `legal_documents`: one row per **version** of a document (`slug` +
  `version` unique together). A row is enforceable only once
  `published_at` is set and in the past — draft rows can exist without
  being active.
- `legal_acceptances`: one immutable row per (user, document version)
  pair, `unique (user_id, document_id)`. Written only through the
  service-role client (`src/lib/legal/acceptance.ts`'s
  `recordLegalAcceptances`), which derives `ip_address`/`user_agent`
  from the request itself — never from client-supplied fields — and
  lets Postgres's own clock set `accepted_at`. Re-accepting the same
  version is a harmless upsert-with-`ignoreDuplicates` no-op: it can
  never overwrite the original acceptance's timestamp or IP.

"Which documents are currently required" is a code-level constant
(`REQUIRED_LEGAL_SLUGS` in `src/lib/legal/acceptance.ts`), not derived
from whatever happens to be in the table — publishing a new document
slug doesn't gate anyone until a deliberate code change adds it to that
list. "Is a specific user currently compliant" is computed by diffing
their acceptance rows against the *latest published row per required
slug* (`getMissingLegalAcceptances`) — publishing a new version for an
existing slug automatically makes every user who only accepted the
prior version show up as non-compliant again, without touching a single
user row.

Enforcement is wired through `middleware.ts` + `/legal/re-accept` (see
ADR-003 for the cookie fast-path this uses, including its accepted
bounded-staleness tradeoff).

## Consequences
- Full audit trail by construction: "what did user X agree to, and
  when, from what IP" is a single indexed query, and the data can never
  be silently lost to a later acceptance overwriting it.
- Publishing a new version of an existing document (bump the `version`
  string, insert a new `legal_documents` row, leave the old row alone)
  is the entire mechanism for "this changed, please re-accept" — no
  application code change needed per publish, only a data change. There
  is currently no admin UI for this (out of scope for Phase 1A); it's a
  direct SQL insert via the service role, same as the seed rows in
  migration 0007.
- `profiles.terms_accepted_at` is kept, not removed, purely as a cheap
  boolean-ish "has this user accepted anything, ever" check for simple
  UI/analytics — every place that needs an authoritative answer must
  use `legal_acceptances`/`getMissingLegalAcceptances`, never this
  column alone.
- This design has no support for "user actively revokes/withdraws
  consent" as a distinct state (as opposed to simply not having
  accepted the current version) — if that becomes a real requirement,
  it needs its own column or event type; be tracked as a follow-up
  rather than overloaded onto the absence of an acceptance row, which
  today just means "hasn't gotten to it yet," not "explicitly refused."
