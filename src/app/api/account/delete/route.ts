import { NextResponse } from "next/server";
import { verifyAuthenticatedUser } from "@/lib/supabase/auth-guard";
import { createAdminClient } from "@/lib/supabase/admin";

/** Starts the documented 30-day recovery period; no user data is purged here. */
export async function POST() {
  const auth = await verifyAuthenticatedUser();
  if (!auth.ok) return auth.response;

  const { error } = await createAdminClient()
    .from("profiles")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", auth.data.user.id)
    .is("deleted_at", null);

  if (error) {
    return NextResponse.json({ error: { code: "UPSTREAM_ERROR", message: error.message } }, { status: 502 });
  }
  return NextResponse.json({ recoveryEndsInDays: 30 });
}
