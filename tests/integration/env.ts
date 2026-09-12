import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Integration tests need a real (disposable!) Supabase project — either
 * `supabase start` locally or a dedicated CI test project — because they
 * exercise actual Postgres triggers and RLS policies, which cannot be
 * meaningfully mocked. NEVER point these at a production project:
 * every test in tests/integration/ creates and hard-deletes auth users.
 *
 * Set in .env.test (gitignored) or CI secrets:
 *   TEST_SUPABASE_URL
 *   TEST_SUPABASE_SERVICE_ROLE_KEY
 *
 * When unset, every integration test file uses `describe.skipIf(!hasTestEnv)`
 * so `npm test` still passes locally/in CI without them configured — the
 * foundation is in place, but these don't block the pipeline until a
 * disposable test project is wired up (see tests/README.md).
 */
export const hasTestEnv = Boolean(
  process.env.TEST_SUPABASE_URL && process.env.TEST_SUPABASE_SERVICE_ROLE_KEY,
);

export function createTestAdminClient() {
  if (!hasTestEnv) {
    throw new Error("createTestAdminClient() called without TEST_SUPABASE_* env vars set");
  }
  return createClient<Database>(
    process.env.TEST_SUPABASE_URL!,
    process.env.TEST_SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
