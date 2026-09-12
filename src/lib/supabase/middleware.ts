import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database";

/**
 * Refreshes the Supabase auth session on every request and returns
 * both the (possibly updated) response and the resolved user, so
 * middleware.ts can make routing decisions without a second round trip.
 *
 * Also returns `softDeleted: true` if the signed-in user is in the
 * 30-day post-delete recovery window (profile.deleted_at is set).
 * Middleware uses this to redirect soft-deleted users to
 * /account/restore before any other Route Handler can be hit.
 * The profile lookup is best-effort; a transient DB error cannot
 * lock users out of auth pages. The API-layer
 * verifyAuthenticatedUser guard is the authoritative check.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANT: do not run any logic between createServerClient and
  // getUser() â€” Supabase needs this call to refresh the token.
  const {
    data: { user },
  } = await supabase.auth.getUser();

    let softDeleted = false;
  if (user) {
    try {
      const { data } = await supabase
        .from("profiles")
        .select("deleted_at")
        .eq("id", user.id)
        .single();
      softDeleted = Boolean(data?.deleted_at);
    } catch {
      // Best-effort only; the API-layer verifyAuthenticatedUser guard
      // is the authoritative check.
    }
  }

  return { supabaseResponse, user, softDeleted };
}


