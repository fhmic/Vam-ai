# VAM — Production Setup Guide

This is the single source of truth for going from a fresh `git clone` to
a live production deployment. Follow it top-to-bottom; each step lists
the exact commands and the exact Vercel / Supabase UI clicks you need.

If anything here disagrees with the README, the README is older — this
document is canonical for the deployment flow.

---

## 0. Prerequisites

You need accounts / CLI tools for:

- **GitHub** — repo lives there
- **Vercel** — hosts the Next.js app
- **Supabase** — Postgres + auth + storage
- **Groq** — chat / STT / TTS model API
- **Supabase CLI** (`supabase`) — for migrations and type-gen
- **Node.js 18.18+** — see `engines` in `package.json`

A Vercel team on the **Pro plan or higher is strongly recommended** for
production. The two Vercel crons (`purge-deleted-accounts`,
`memory-consolidate`) work on Hobby but with a 10s function timeout —
fine for an early user base, not for a thousand-user production load.

---

## 1. Local first

The fastest way to know the app is wired correctly is to run it locally
against the Supabase dev stack before touching any cloud project.

```bash
npm install
cp .env.example .env.local
# Leave the values as placeholders for now; you'll fill in real
# values from `supabase start` in the next step.
npx supabase start
```

`supabase start` prints a block of local credentials. Copy them into
`.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=<API URL from supabase start>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key from supabase start>
SUPABASE_SERVICE_ROLE_KEY=<service_role key from supabase start>
```

Apply the migrations and seed data (this happens automatically the first
time you `supabase start`, but to re-run later):

```bash
npx supabase db reset
```

Regenerate the typed `Database` interface so the rest of the codebase
sees your local schema:

```bash
npm run db:types
```

Run the four local gates and confirm they pass:

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

If any of these fail, the production deploy will fail in the same way —
fix locally first.

Run the dev server and sign up at `http://localhost:3000/sign-up` to
prove the full onboarding / mentor / voice loop works end-to-end:

```bash
npm run dev
```

---

## 2. Create the Supabase project (one per environment)

In the Supabase dashboard:

1. **New project** — name it e.g. `vam-production`. Pick the same region
   your Vercel project is in. Set a strong database password and **save
   it** — you'll need it for migrations.
2. Wait for the project to provision.
3. **Settings → API**: copy the **Project URL**, **anon public** key,
   and **service_role** key. Treat the service_role key like a password
   — it bypasses RLS.
4. **Settings → Database → Connection string → URI**: copy the "Direct
   connection" string. The password is the one you set in step 1. (The
   pooler URL is for runtime; the direct URL is for `supabase db push`.)

### Storage bucket (one-time, per project)

The `voice-sessions` bucket is created by migration
`0028_voice_sessions_bucket.sql`, which is part of the standard
migration set, so it'll appear automatically the first time you push
migrations (step 3). No manual bucket creation needed.

If you ever need to create it manually (e.g. for a one-off test
project), in the Supabase dashboard:

- **Storage → New bucket** → name `voice-sessions`, **Private**,
  file size limit 25 MiB, MIME types
  `audio/webm, audio/ogg, audio/mp4, audio/wav, audio/mpeg`.

### Authentication settings

In **Authentication → URL Configuration**:

- **Site URL**: your production origin, e.g. `https://vam.example.com`
- **Additional Redirect URLs**: add the same origin plus
  `https://vam.example.com/auth/callback` and your Vercel preview
  domain pattern, e.g. `https://vam-git-*.vercel.app/**` (or the
  explicit preview URL you use).

In **Authentication → Email Templates**, customize the "Confirm
signup", "Magic link", and "Reset password" templates to match your
product copy. The defaults are functional but read like generic
Supabase boilerplate.

---

## 3. Apply migrations to the project

Link the local repo to the remote project (do this once per machine):

```bash
npx supabase link --project-ref <your-project-ref>
# It will ask for the database password you set in step 2.
```

Push the local migration history to the remote project:

```bash
npx supabase db push
```

This applies every `.sql` file in `supabase/migrations/` in name order.
The `0028_voice_sessions_bucket.sql` migration creates the private
`voice-sessions` storage bucket + RLS policies as part of this single
step.

Regenerate types against the linked (real) project so production type
accuracy is preserved:

```bash
npm run db:types
git add src/types/database.ts
git commit -m "chore: regenerate types against linked project"
```

`db-types.mjs` automatically picks `--linked` when
`supabase/.temp/project-ref` exists (i.e. after `supabase link`) and
`--local` otherwise — you don't need to remember which.

---

## 4. Create the Vercel project

In Vercel:

1. **Add New → Project** → import the GitHub repo.
2. **Framework preset**: Next.js (auto-detected).
3. **Build & output settings**: leave defaults (`next build`, output not
   preset).
4. **Environment variables** — copy every key from `.env.example` and
   fill in the **production** values:

   | Variable | Source |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
   | `SUPABASE_SERVICE_ROLE_KEY` | Supabase service-role key |
   | `NEXT_PUBLIC_APP_URL` | Your production origin (e.g. `https://vam.example.com`) |
   | `GROQ_API_KEY` | Groq console API key |
   | `GROQ_MODEL_CHAT` | e.g. `llama-3.3-70b-versatile` (see https://console.groq.com/docs/models for the current production id) |
   | `GROQ_MODEL_UTILITY` | e.g. `llama-3.1-8b-instant` |
   | `GROQ_MODEL_STT` | e.g. `whisper-large-v3-turbo` |
   | `GROQ_MODEL_TTS` | e.g. `playai-tts` |
   | `INTERNAL_CRON_SECRET` | See step 5 — must match the cron auth header value |
   | `SENTRY_DSN` (optional) | Sentry project DSN — leave blank to disable |
   | `NEXT_PUBLIC_SENTRY_DSN` (optional) | Same as above for client-side error reporting |

   Set these for **Production**, **Preview**, and **Development** as
   appropriate. Production values must point at the production Supabase
   project; Preview can either share or use a separate staging project
   (recommended for serious staging).

---

## 5. Wire the Vercel crons

`vercel.json` declares two crons:

```json
{
  "crons": [
    { "path": "/api/internal/purge-deleted-accounts", "schedule": "0 6 * * *" },
    { "path": "/api/internal/memory-consolidate",      "schedule": "0 3 * * *" }
  ]
}
```

Both routes authenticate via a shared bearer token
(`INTERNAL_CRON_SECRET`) using constant-time comparison
(`crypto.timingSafeEqual`).

Vercel cron jobs send the secret automatically as
`Authorization: Bearer <value>` when the project's CRON_SECRET env var
is set — Vercel reads this name from the schedule definition itself.
You have two equivalent ways to wire it:

### Option A (recommended): set the env var in Vercel

1. In the Vercel project, **Settings → Environment Variables**, add
   `INTERNAL_CRON_SECRET` with the **same value** you set in step 4
   (32-byte random hex — generate with
   `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`).
2. That's it. Vercel automatically sends it as the Bearer token on
   every cron invocation.

### Option B: per-cron header in `vercel.json`

If you ever need a different secret per cron, add a `headers` block to
the cron entry:

```json
{
  "path": "/api/internal/memory-consolidate",
  "schedule": "0 3 * * *",
  "headers": [{ "key": "Authorization", "value": "Bearer <token>" }]
}
```

Use the same `<token>` in `INTERNAL_CRON_SECRET` env var on Vercel.

### Verify a cron is wired

After the first deploy, in Vercel:

1. **Logs** → find the next scheduled run for either cron.
2. Look for a `200` response with body like `{"purged":0}` or
   `{"scannedUsers":N,"candidates":0,...}`.
3. If you see a `401`, the secret on Vercel doesn't match the env var
   value — fix and redeploy.

---

## 6. GitHub Actions secrets

`.github/workflows/ci.yml` and `deploy.yml` need:

| Secret | Where to get it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_ACCESS_TOKEN` | Personal access token from `supabase login` → `npx supabase login` then copy the access token from the Supabase dashboard under Account → Access Tokens |
| `SUPABASE_PROJECT_REF` | The slug in the Supabase project URL, e.g. `abcdefghij` from `https://supabase.com/dashboard/project/abcdefghij` |
| `SUPABASE_DB_PASSWORD` | The database password you set in step 2 |

Set them in **GitHub → Settings → Secrets and variables → Actions** of
the repo. The CI workflow needs only the first two; the deploy workflow
needs all five.

---

## 7. First deploy

Push to `main`:

```bash
git push origin main
```

This triggers, in order:

1. **CI** (`.github/workflows/ci.yml`) — typecheck, lint, unit tests,
   build. If any of these fail, the merge is blocked.
2. **Deploy** (`.github/workflows/deploy.yml`) — runs
   `supabase db push --linked --dry-run` first to confirm migrations
   reconcile, then `supabase db push --linked` to actually apply them.
   **This is what makes the database and the code never drift.**
3. **Vercel** (its own GitHub integration) — builds and deploys the
   Next.js app to your production domain.

After the first deploy:

1. Open `https://vam.example.com` and sign up.
2. Check the Supabase dashboard **Table Editor** — you should see rows
   in `profiles`, `user_preferences`, `legal_acceptances`,
   `mentor_assignments`, `messages`, `memory_items` after using the
   app for a few minutes.
3. Check Vercel **Logs** for any unhandled errors.

---

## 8. Observability (optional but recommended)

### Sentry

If you set `SENTRY_DSN` and `NEXT_PUBLIC_SENTRY_DSN` in step 4, the app
is wired to forward errors to Sentry. (The current code path keeps
these as **optional** env vars — no Sentry SDK is initialized in the
build, leaving room to add the SDK in a follow-up change without
breaking this deploy.)

If you want Sentry **now**, the smallest viable addition is:

```bash
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
# Then commit the new sentry.*.config.ts files + the updated next.config.mjs
```

After that, redeploy — Sentry will start receiving both client and
server errors.

### Vercel Analytics / Log Drains

Vercel **Web Analytics** and **Speed Insights** can be turned on from
the project dashboard with a one-click toggle. **Log Drains** (Pro
plan) can forward every function log to Datadog, Logflare, Honeycomb,
etc. — recommended for any production team.

### Request correlation

Every `/api/internal/*` response carries an `X-Request-Id` header
(auto-generated if not provided; preserved if upstream already set
one). Quote this in any support ticket to find the exact log line in
30 seconds.

---

## 9. Production runbook

### Soft-deleted accounts

A user who deletes their account from **Settings → Delete** is marked
`deleted_at = now()` and locked out of all routes (the centralized
auth-guard at `src/lib/supabase/auth-guard.ts` checks this). The
`purge-deleted-accounts` cron (6:00 UTC daily) hard-deletes the
`auth.users` row 30 days after the soft delete, which cascades through
every owned row. Recovery is possible during that 30-day window via
`/account/restore` (token emailed on request).

### Memory consolidation

The `memory-consolidate` cron (3:00 UTC daily) walks all users with >
30 active memory items and asks Groq to merge them into fewer, denser
`episodic_summary` items, then marks the originals as superseded
(preserved for audit). Per-run cap is 25 users to stay well under the
Vercel Hobby function timeout; remaining users get picked up the next
night.

### Adding a new cron

1. Create `src/app/api/internal/<name>/route.ts` — it must call
   `hasValidCronSecret(request)` from `@/lib/api/cron-auth` and return
   `401` on failure.
2. Add an entry to `vercel.json` with a `schedule` and the standard
   `Authorization: Bearer <INTERNAL_CRON_SECRET>` header (or rely on
   the env-var-driven default).
3. Update the `## 5. Wire the Vercel crons` section above.

### Adding a new legal document

Legal documents are versioned, append-only, and require re-acceptance.
To publish a new version of, say, the Terms:

1. Edit the `src/app/legal/terms/page.tsx` content.
2. Add a new row in `supabase/migrations/<next>_terms_v2.sql`:
   ```sql
   insert into public.legal_documents (name, slug, version, published_at)
   values ('Terms of Service', 'terms-of-service', '2026-01-01', now());
   ```
3. Run `npx supabase db push`.
4. Every user who accepted the previous version will be routed through
   `/legal/re-accept` on their next request (after the 24h cookie
   freshness window from ADR-003). The new version MUST also be added
   to `REQUIRED_LEGAL_SLUGS` in `src/lib/legal/required-slugs.ts` if
   it's a *new* document (not a re-version of an existing one).
5. Re-run `npm run db:types` and commit.

---

## 10. What the user-facing product does

Once the above is in place, end users can:

- Sign up / sign in / reset password (email auth via Supabase)
- Complete onboarding (display name, country, profession, primary
  goal, mentor style, coaching intensity) and accept the four
  required legal documents
- Chat with an AI mentor (Morgan / Ava / Priya / Elias) assigned by a
  deterministic matching engine — with one-click **Try a different
  mentor** re-matching
- Use the mentor in text mode or push-to-talk voice mode, or in a
  hands-free "live" mode with barge-in (VAD-driven interruption of
  the mentor mid-reply)
- Take assessments (e.g. Communication Style Baseline) and see
  per-dimension trend charts
- Follow a 30-day curriculum (auto-enrolled at onboarding) with one
  objective per day
- Generate weekly action plans
- Track progress (total messages, day-streak)
- Export or delete their data (GDPR-style)
- View collective intelligence insights (only if they opted in via
  `/legal/re-accept`)
- Admins (any user manually inserted into `admin_users` via SQL
  console) get a back-office insights editor at `/admin`

---

## 11. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `supabase start` fails to bind a port | Another Supabase stack is running | `supabase stop --no-backup` |
| `npm run db:types` errors "project not linked" | Expected when no project is linked | Run `npx supabase link --project-ref <ref>` first |
| Sign-in succeeds but every page returns 401 | `NEXT_PUBLIC_SUPABASE_URL` env var doesn't match the project | Re-check Vercel env vars, redeploy |
| Mentor chat returns 502 "Groq model configuration is missing" | `GROQ_MODEL_CHAT` / `GROQ_MODEL_UTILITY` env vars not set | Set them in Vercel, redeploy |
| Voice TTS returns 502 | `GROQ_MODEL_TTS` env var not set, or Groq model name has been deprecated | Check https://console.groq.com/docs/models, update env var |
| Cron returns 401 | `INTERNAL_CRON_SECRET` env var mismatch | Make sure Vercel has the same value the route expects |
| `voice-sessions` upload fails with 403 | RLS policy missing | Confirm migration 0028 applied; check `select * from pg_policies where tablename = 'objects' and policyname like 'voice_sessions%'` |
| Production build fails with "Module not found: Can't resolve 'zod'" | A new dep was added but `npm install` not run | `npm install` locally, then push the updated `package-lock.json` |
