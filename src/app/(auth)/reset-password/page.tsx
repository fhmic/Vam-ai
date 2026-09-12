import { ResetPasswordForm } from "./reset-password-form";

/**
 * Build fix: this page used to be a "use client" component that called
 * `createClient()` at module top-level, which throws during the
 * prerender pass with no Supabase env vars. Splitting into a
 * server-component page + a client form lets us mark the route as
 * `dynamic = "force-dynamic"`.
 */
export const dynamic = "force-dynamic";

export default function ResetPasswordPage() {
  return <ResetPasswordForm />;
}
