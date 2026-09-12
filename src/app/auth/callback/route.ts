import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { handleAuthCallback } from "@/lib/supabase/auth-callback";

/**
 * Handles the redirect back from Supabase Auth after:
 *  - Google OAuth sign-in
 *  - Email confirmation link
 *  - Password recovery link
 * Exchanges the `code` param (or token hash for recovery links) for a session,
 * then routes the user onward. Middleware takes over from here for onboarding gating.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const { origin } = url;
  const searchParams = new URLSearchParams(url.search);
  const hash = url.hash.startsWith("#") ? url.hash.slice(1) : url.hash;

  if (hash) {
    const hashParams = new URLSearchParams(hash);
    for (const [key, value] of hashParams.entries()) {
      searchParams.set(key, value);
    }
  }

  const supabase = await createClient();

  const nextPath = await handleAuthCallback({
    searchParams,
    exchangeCodeForSession: (code) => supabase.auth.exchangeCodeForSession(code),
    setSession: (params) => supabase.auth.setSession(params),
  });

  return NextResponse.redirect(`${origin}${nextPath}`);
}
