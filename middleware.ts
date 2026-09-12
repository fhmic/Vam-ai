import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const AUTH_ROUTES = ["/sign-in", "/sign-up", "/reset-password", "/update-password", "/auth/callback"];
const PUBLIC_ROUTES = ["/"];
// /legal/* (document text) must stay reachable while a user is stuck on
// the re-accept gate — otherwise they can't open the very documents
// they're being asked to (re-)read.
const LEGAL_ROUTE_PREFIX = "/legal";
const ACCOUNT_RESTORE_ROUTE = "/account/restore";

export async function middleware(request: NextRequest) {
  const { supabaseResponse, user, softDeleted } = await updateSession(request);
  const { pathname } = request.nextUrl;

  const isAuthRoute = AUTH_ROUTES.some((route) => pathname.startsWith(route));
  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);
  const isLegalRoute = pathname.startsWith(LEGAL_ROUTE_PREFIX);
  const isAccountRestoreRoute = pathname === ACCOUNT_RESTORE_ROUTE;

  // Soft-deleted user (still has a valid auth session during the
  // 30-day recovery window) -> force them to /account/restore. They
  // should not be able to reach /dashboard, /onboarding, or any
  // other protected surface. /account/restore itself and the
  // /sign-out path are exempt so the user can either restore or
  // walk away.
  if (user && softDeleted && !isAccountRestoreRoute) {
    return NextResponse.redirect(new URL(ACCOUNT_RESTORE_ROUTE, request.url));
  }

  // Not signed in and hitting a protected route -> send to sign-in
  if (!user && !isAuthRoute && !isPublicRoute && !isLegalRoute && !isAccountRestoreRoute) {
    const redirectUrl = new URL("/sign-in", request.url);
    redirectUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Signed in and hitting an auth route -> send to dashboard, except for
  // the password update screen used immediately after a recovery link
  if (user && isAuthRoute && pathname !== "/update-password") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (user && !isAuthRoute && !isPublicRoute && !isLegalRoute && !isAccountRestoreRoute) {
    // Signed in, on a protected route, but hasn't finished onboarding ->
    // force onboarding (except the onboarding route itself). Onboarding
    // itself collects every required legal acceptance (see
    // /api/onboarding/complete), so a user who clears this gate has
    // already cleared the legal gate below too.
    if (pathname !== "/onboarding") {
      const onboardingDone = request.cookies.get("va_onboarding_done")?.value === "1";

      if (!onboardingDone) {
        // Cookie is a fast-path hint only; the /onboarding page and its
        // API route re-verify against the database, which is the real
        // source of truth. This avoids a DB round trip on every request.
        return NextResponse.redirect(new URL("/onboarding", request.url));
      }
    }

    // Onboarded but a legal document they previously accepted has a
    // newer published version (CTO Review Change #1: "future legal
    // updates must require re-acceptance") -> force re-acceptance.
    // Same fast-path-cookie pattern as onboarding: the cookie only
    // short-circuits the common case; /legal/re-accept re-derives the
    // authoritative answer from legal_acceptances vs legal_documents on
    // every load, so a stale cookie can never let someone skip it.
    if (pathname !== "/onboarding" && pathname !== "/legal/re-accept") {
      const legalCurrent = request.cookies.get("va_legal_current")?.value === "1";

      if (!legalCurrent) {
        return NextResponse.redirect(new URL("/legal/re-accept", request.url));
      }
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static assets and image
     * optimization files, so middleware runs on pages and API routes
     * but not on every asset request.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
