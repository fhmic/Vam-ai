# ADR-001: Column-Level Grants vs Unrestricted Updates

## Status
Accepted

## Context
Row Level Security (RLS) on `profiles` decides *which rows* a user can
touch (`auth.uid() = id`), but on its own does nothing to restrict
*which columns* within an allowed row a user may write. Several columns
on `profiles` are not safe for a user to set directly, e.g.
`plan` (billing tier — should only change via a paid checkout/webhook
flow) and `onboarding_completed_at` (should only be set by the
onboarding completion route, after real validation, not toggled by the
client to skip onboarding).

A single blanket `for update using (auth.uid() = id) with check
(auth.uid() = id)` policy, combined with a normal `grant update on
profiles to authenticated`, would let any signed-in user set `plan =
'pro'` on their own row directly through PostgREST with no server-side
check at all.

## Decision
Grant `update` on `profiles` to `authenticated` for a specific column
list only (migration 0006: `display_name`, `avatar_url`, `timezone`;
extended in migration 0008 with `profession`, `experience_level`,
`primary_goal`). Sensitive columns (`plan`, `onboarding_completed_at`,
`terms_accepted_at`, `deleted_at`) are **not** in that grant. Writes to
those columns can only happen through the service-role (admin) client,
inside a server route that performs its own validation first — see
ADR-002 for how those routes authenticate before touching the admin
client.

RLS row policies stay simple (`auth.uid() = id`); the column grant is
what actually enforces "user can edit their display name, not their
plan," independent of whether a future policy change accidentally
widens row access.

## Consequences
- Every new "user-editable" profile field must be deliberately added to
  the grant list in a migration — it doesn't happen automatically just
  because RLS allows the row.
- Every new "server-only" field (billing state, moderation flags,
  computed/derived fields) is safe by default: it's simply absent from
  the grant, no extra policy needed to protect it.
- A future generic "update my profile" client-side settings form must
  only ever send the granted columns — sending an ungranted column in a
  PostgREST PATCH will fail per-column, not silently succeed on the rest
  or silently drop the field.
