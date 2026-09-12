import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Privileged Supabase client using the SERVICE ROLE key.
 * Bypasses RLS entirely — this must NEVER be imported into any file
 * that could end up in a Client Component bundle. The `server-only`
 * import above makes any accidental client import a build-time error.
 *
 * Use ONLY for operations that are explicitly server-controlled, e.g.
 * marking onboarding_completed_at, setting plan, or future admin
 * tooling. Every call site must independently verify the caller's
 * identity/session before using this client — it does not check
 * authorization itself.
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
