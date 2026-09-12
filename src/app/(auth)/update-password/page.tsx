import { UpdatePasswordForm } from "./update-password-form";

/**
 * Build fix: was a single "use client" file that called
 * `createClient()` at module top-level, which throws during the
 * prerender pass with no Supabase env vars. Split into a
 * server-component page + a client form so the route can be marked
 * `dynamic = "force-dynamic"`.
 *
 * Middleware intentionally lets a signed-in user reach this page
 * (it is the only auth route not redirected to /dashboard when
 * already signed in) so that the recovery-link flow works.
 */
export const dynamic = "force-dynamic";

export default function UpdatePasswordPage() {
  return <UpdatePasswordForm />;
}
