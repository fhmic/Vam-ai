import { SignUpForm } from "./sign-up-form";

/**
 * Build fix: this page used to be a "use client" component that called
 * `createClient()` at module top-level. Next still renders client
 * components once during the static prerender pass, and with no Supabase
 * env vars set `next build` aborted. Splitting into a server-component
 * page that imports a client form lets us mark the route as
 * `dynamic = "force-dynamic"` so it is never prerendered.
 */
export const dynamic = "force-dynamic";

export default function SignUpPage() {
  return <SignUpForm />;
}
