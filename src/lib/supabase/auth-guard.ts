import "server-only";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";

/**
 * CTO Review Foundation Hardening — Change #6: Admin Client Safety.
 *
 * Centralized session-validation pattern. `createAdminClient()`
 * (src/lib/supabase/admin.ts) bypasses RLS entirely and, by design,
 * performs NO authorization check of its own — every call site was
 * previously responsible for remembering to validate the session first,
 * which is exactly the kind of "developer must remember" risk that leads
 * to an accidentally-open privileged route.
 *
 * `verifyAuthenticatedUser()` is the single reusable choke point: any
 * Route Handler that needs `createAdminClient()` calls this FIRST and
 * only proceeds if it returns a user. This doesn't make the admin client
 * itself check auth — it makes "check auth before touching the admin
 * client" a one-line, impossible-to-forget call instead of a convention
 * every future route has to independently remember.
 */
export interface VerifiedUser {
  user: User;
  /** RLS-scoped server client, already bound to this request's cookies. */
  supabase: Awaited<ReturnType<typeof createClient>>;
}

export type VerifyAuthResult =
  | { ok: true; data: VerifiedUser }
  | { ok: false; response: NextResponse };

/**
 * Resolves the authenticated user for the current request from the
 * RLS-scoped server client (never from a client-supplied user id/header —
 * see the "Client forges another user's user_id" threat model entry in
 * the Phase 1 blueprint, Section 14.6).
 *
 * Also rejects a soft-deleted account (profiles.deleted_at is set) with
 * the same 401 shape as "not signed in" — added during the Phase 1A
 * Final Production Readiness Audit (Phase 3 — Soft Delete Audit) after
 * finding that no privileged route checked this at all. This is the
 * single choke point for every Route Handler that uses the admin
 * client, so fixing it here closes the gap everywhere at once rather
 * than requiring each route to remember an extra check (the exact
 * failure mode Change #6 exists to prevent in the first place).
 *
 * Returns a discriminated union so call sites can do:
 *
 *   const auth = await verifyAuthenticatedUser();
 *   if (!auth.ok) return auth.response;
 *   const { user } = auth.data;
 *
 * without re-deriving the 401 JSON shape at every call site.
 */
export async function verifyAuthenticatedUser(): Promise<VerifyAuthResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: { code: "UNAUTHENTICATED", message: "Not signed in" } },
        { status: 401 },
      ),
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("deleted_at")
    .eq("id", user.id)
    .single();

  if (profile?.deleted_at) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: { code: "UNAUTHENTICATED", message: "Not signed in" } },
        { status: 401 },
      ),
    };
  }

  return { ok: true, data: { user, supabase } };
}
