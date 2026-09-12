-- 0001_init_extensions.sql
-- Enables extensions required by the foundation schema.
-- pgvector is enabled here (Phase 1A) even though it is first used by
-- Mentor Memory in Phase 1B, so the schema does not need a breaking
-- extension-install migration later.

create extension if not exists "pgcrypto";   -- gen_random_uuid()
create extension if not exists "vector";      -- pgvector, used from Phase 1B onward
