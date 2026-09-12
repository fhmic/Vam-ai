import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Deliberately does not use verifyAuthenticatedUser(): that guard correctly
 * rejects soft-deleted accounts, while this is the one endpoint that lets an
 * authenticated deleted user restore themselves during the recovery period.
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Not signed in" } }, { status: 401 });
  }

  const { error } = await createAdminClient()
    .from("profiles")
    .update({ deleted_at: null })
    .eq("id", user.id)
    .not("deleted_at", "is", null);
  if (error) {
    return NextResponse.json({ error: { code: "UPSTREAM_ERROR", message: error.message } }, { status: 502 });
  }
  return NextResponse.json({ restored: true });
}
