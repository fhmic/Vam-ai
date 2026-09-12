-- 0014_memory_items.sql
-- Stage 2.4 — Conversation Memory.
--
-- `embedding` is included for future semantic retrieval but is NOT
-- populated as of this migration — Groq does not currently offer an
-- embeddings endpoint, and no other embedding provider has been chosen
-- yet. Retrieval (src/lib/memory/retrieval.ts) ranks by
-- importance x recency only until an embedding provider is selected.
-- This is a deliberate, documented gap, not an oversight — see
-- docs/STAGE-2-NOTES.md.

create table if not exists public.memory_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('fact', 'preference', 'goal_reference', 'episodic_summary')),
  content text not null,
  source_message_id uuid references public.messages(id) on delete set null,
  importance numeric not null default 0.5 check (importance between 0 and 1),
  embedding vector(1536),
  superseded_by uuid references public.memory_items(id),
  created_at timestamptz not null default now()
);

create index if not exists memory_items_user_type_idx
  on public.memory_items (user_id, type);

create index if not exists memory_items_user_active_idx
  on public.memory_items (user_id, importance desc, created_at desc)
  where superseded_by is null;

alter table public.memory_items enable row level security;

create policy "memory_items_select_own"
  on public.memory_items
  for select
  to authenticated
  using (auth.uid() = user_id);

-- No insert/update/delete policy for `authenticated`: memory is written
-- only by src/lib/memory/extraction.ts via the admin client, following
-- a Groq structured-output call — a user cannot inject arbitrary
-- "memories" about themselves directly, which matters once memory
-- content is fed back into future system prompts.
