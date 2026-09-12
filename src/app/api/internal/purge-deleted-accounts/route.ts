import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasValidCronSecret } from "@/lib/api/cron-auth";
import { getOrCreateRequestId, requestIdHeaders } from "@/lib/api/request-id";

const RECOVERY_DAYS = 30;

/**
 * Called by a trusted scheduler with INTERNAL_CRON_SECRET. Deleting auth.users
 * cascades through profiles and user-owned rows; it is intentionally the only
 * irreversible step in the account lifecycle.
 */
export async function GET(request: Request) {
  const requestId = getOrCreateRequestId(request);

  if (!hasValidCronSecret(request)) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Invalid cron authorization" } },
      { status: 401, headers: requestIdHeaders(requestId) },
    );
  }

  const cutoff = new Date(Date.now() - RECOVERY_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const admin = createAdminClient();
  const { data: accounts, error } = await admin.from("profiles").select("id").lt("deleted_at", cutoff).limit(100);
  if (error) {
    return NextResponse.json(
      { error: { code: "UPSTREAM_ERROR", message: error.message } },
      { status: 502, headers: requestIdHeaders(requestId) },
    );
  }

  const results = await Promise.all((accounts ?? []).map(({ id }) => admin.auth.admin.deleteUser(id)));
  const failures = results.filter(({ error: deleteError }) => deleteError).length;
  if (failures) {
    return NextResponse.json(
      { error: { code: "PURGE_PARTIAL_FAILURE", message: `${failures} account(s) could not be purged` } },
      { status: 502, headers: requestIdHeaders(requestId) },
    );
  }
  return NextResponse.json({ purged: accounts?.length ?? 0 }, { headers: requestIdHeaders(requestId) });
}
