import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getMissingLegalAcceptances } from "@/lib/legal/acceptance";
import { ReAcceptForm } from "./re-accept-form";

/**
 * CTO Review Foundation Hardening — Change #1: Legal Acceptance System.
 *
 * Reachable two ways:
 *   1. Directly, e.g. from a settings "Legal" tab.
 *   2. Via middleware.ts, which redirects any onboarded user whose
 *      `va_legal_current` cookie is missing here. The cookie is only a
 *      fast-path hint (same pattern as `va_onboarding_done`) — this page
 *      re-derives the authoritative answer from the DB every time via
 *      getMissingLegalAcceptances(), so a stale/cleared cookie never
 *      lets someone skip re-acceptance, and a user with nothing
 *      outstanding is bounced straight back with the cookie repaired.
 */
export default async function ReAcceptLegalPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  const missingDocuments = await getMissingLegalAcceptances(supabase, user.id);

  if (missingDocuments.length === 0) {
    const cookieStore = await cookies();
    cookieStore.set("va_legal_current", "1", { path: "/" });
    redirect("/dashboard");
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-16">
      <h1 className="text-2xl font-semibold text-slate-900">Updated agreements</h1>
      <p className="mt-1 text-sm text-slate-500">
        We&apos;ve updated the following. Please review and re-accept to continue using VA.
      </p>
      <div className="mt-8">
        <ReAcceptForm
          documents={missingDocuments.map((doc) => ({
            id: doc.id,
            name: doc.name,
            slug: doc.slug,
          }))}
        />
      </div>
    </div>
  );
}
