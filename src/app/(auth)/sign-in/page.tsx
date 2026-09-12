import { Suspense } from "react";
import { SignInForm } from "./sign-in-form";

/**
 * Build fix: must not be statically prerendered — `SignInForm` is a
 * client component that calls `createClient()` at module top-level,
 * which throws during the prerender pass when no Supabase env vars
 * are set (CI / fresh checkout).
 */
export const dynamic = "force-dynamic";

export default function SignInPage() {
  return (
    <Suspense fallback={null}>
      <SignInForm />
    </Suspense>
  );
}
