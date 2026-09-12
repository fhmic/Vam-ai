import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyAuthenticatedUser } from "@/lib/supabase/auth-guard";

const bodySchema = z.object({ optedIn: z.boolean() });

export async function POST(request: Request) {
  const auth = await verifyAuthenticatedUser();
  if (!auth.ok) return auth.response;
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "optedIn must be a boolean" } }, { status: 400 });
  }

  const now = new Date().toISOString();
  const { error } = await auth.data.supabase.from("collective_intelligence_consents").upsert(
    parsed.data.optedIn
      ? { user_id: auth.data.user.id, consented_at: now, revoked_at: null }
      : { user_id: auth.data.user.id, revoked_at: now },
    { onConflict: "user_id" },
  );
  if (error) return NextResponse.json({ error: { code: "UPSTREAM_ERROR", message: error.message } }, { status: 502 });
  return NextResponse.json({ optedIn: parsed.data.optedIn });
}
