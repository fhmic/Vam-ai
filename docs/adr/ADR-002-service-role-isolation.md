# ADR-002: Service-Role Isolation Strategy

## Status
Accepted

## Context
`src/lib/supabase/admin.ts` creates a Supabase client using the
service-role key, which bypasses RLS entirely. This is required for a
handful of legitimate cases (writing `onboarding_completed_at` after
server-side validation, recording `legal_acceptances` with a
server-derived IP address that must not be client-spoofable — see
ADR-004). It is also, by definition, the single most dangerous piece of
code in the app: a route that calls `createAdminClient()` without first
checking who's asking can read or write any row for any user.

Before this hardening pass, the only protection against that was
convention — every route author had to remember to call
`supabase.auth.getUser()` themselves before reaching for the admin
client. That's a "developer must remember" risk, not an enforced
invariant, and the CTO review flagged it as the top architectural
concern in Change #6.

## Decision
1. `admin.ts` is marked `import "server-only"` (already the case) so it
   cannot be imported into any client-bundled code path — this is a
   build-time guarantee, not just a code-review convention.
2. A single reusable function, `verifyAuthenticatedUser()`
   (`src/lib/supabase/auth-guard.ts`), is the required first call in any
   Route Handler that goes on to use `createAdminClient()`. It resolves
   the user from the RLS-scoped server client (never from a
   client-supplied id) and returns a discriminated union
   (`{ ok: true, data }` / `{ ok: false, response }`) so the 401 response
   shape is defined once, not re-implemented per route.
3. `/api/onboarding/complete` and `/api/legal/re-accept` both follow the
   pattern: `verifyAuthenticatedUser()` first, admin client only after
   that returns a verified user, and the user id used in every admin
   write comes from the verified session — never from the request body.

This does not make the admin client itself "safe" (it still bypasses
RLS by design) — it makes "verify who's asking before you use the
unsafe client" a one-line, greppable call instead of an unenforced
convention.

## Consequences
- Any new privileged route has an obvious, minimal pattern to copy:
  `const auth = await verifyAuthenticatedUser(); if (!auth.ok) return
  auth.response;`.
- Code review has something concrete to check for: a route importing
  `createAdminClient` without a preceding `verifyAuthenticatedUser()`
  call is a red flag, not a matter of remembering unwritten conventions.
- `verifyAuthenticatedUser()` does not itself authorize *which* actions
  a verified user may perform (e.g. it doesn't check "is this admin
  action allowed for this specific user") — that stays the
  responsibility of each route, same as before. It solves "is anyone
  authenticated at all," not full authorization.
- The CI secret-leak grep step added in `.github/workflows/ci.yml`
  (Change #5) is a complementary, cheap guard for the same underlying
  risk class (service-role key / other server-only secrets ending up
  somewhere they shouldn't) — it isn't a substitute for this pattern,
  it catches a different mistake (accidental client-bundle exposure vs.
  missing auth check).
