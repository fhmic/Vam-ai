import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NavBar } from "@/components/layout/navbar";
import { LegalFooter } from "@/components/layout/legal-footer";
import { ThemeProvider } from "@/components/theme/theme-provider";

/**
 * AUDIT NOTE (Phase 1A Final Production Readiness Audit, Phase 3 — Soft
 * Delete Audit): migration 0009 added profiles.deleted_at but, before
 * this fix, NOTHING in the app ever read it — a soft-deleted user could
 * still authenticate, complete onboarding, and use every protected
 * route normally, because RLS scopes rows by `auth.uid()` only and does
 * not know about `deleted_at` at all.
 *
 * There is still no deletion API route in Phase 1A (that's explicitly
 * deferred — see migration 0009's comment and the README), so today the
 * only way a row gets `deleted_at` set is direct DB/service-role access
 * (e.g. manual support action). But since that path exists, the app
 * must not silently keep serving a marked-deleted account. This is the
 * minimal safe-for-production check: the authenticated shell (which
 * every protected route renders inside of) treats a non-null
 * `deleted_at` as equivalent to "not signed in" — it force-signs-out
 * and redirects, rather than rendering anything.
 *
 * This intentionally does NOT filter deleted users out of any list/
 * query elsewhere in the app — there are no user-list or admin-facing
 * queries yet in Phase 1A to filter. That's tracked as future work once
 * back-office tooling exists (see docs/PHASE-1A-FINAL-AUDIT.md, Phase 3).
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  const [{ data: profile }, { data: adminMembership }] = await Promise.all([
    supabase.from("profiles").select("display_name, deleted_at").eq("id", user.id).single(),
    supabase.from("admin_users").select("user_id").eq("user_id", user.id).maybeSingle(),
  ]);

  if (profile?.deleted_at) {
    redirect("/account/restore");
  }

  return (
    <div className="min-h-screen bg-paper dark:bg-ink">
      <ThemeProvider />
      <NavBar displayName={profile?.display_name ?? null} isAdmin={Boolean(adminMembership)} />
      <main className="mx-auto max-w-5xl px-4 py-10">{children}</main>
      <LegalFooter />
    </div>
  );
}
