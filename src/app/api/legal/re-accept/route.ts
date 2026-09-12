import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyAuthenticatedUser } from "@/lib/supabase/auth-guard";
import { getMissingLegalAcceptances, recordLegalAcceptances } from "@/lib/legal/acceptance";

const bodySchema = z.object({
  acceptedDocumentIds: z.array(z.string().uuid()).min(1),
});

/**
 * Records re-acceptance of legal documents whose required version
 * changed since the user last accepted (see middleware.ts's
 * `va_legal_current` gate and src/app/legal/re-accept/page.tsx).
 *
 * Same authorization pattern as /api/onboarding/complete: auth is
 * verified first via the shared guard, and the server re-derives what's
 * actually outstanding rather than trusting the client's list — a
 * request is only accepted if it covers every currently-missing
 * required document.
 */
export async function POST(request: Request) {
  const auth = await verifyAuthenticatedUser();
  if (!auth.ok) return auth.response;
  const { user, supabase } = auth.data;

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: parsed.error.message } },
      { status: 400 },
    );
  }

  const missingDocuments = await getMissingLegalAcceptances(supabase, user.id);
  const acceptedIds = new Set(parsed.data.acceptedDocumentIds);
  const stillMissing = missingDocuments.filter((doc) => !acceptedIds.has(doc.id));

  if (stillMissing.length > 0) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "You must accept every updated agreement to continue.",
          details: { missingSlugs: stillMissing.map((d) => d.slug) },
        },
      },
      { status: 400 },
    );
  }

  try {
    await recordLegalAcceptances(request, user.id, missingDocuments);
  } catch (acceptanceError) {
    const message =
      acceptanceError instanceof Error ? acceptanceError.message : "Failed to record legal acceptance";
    return NextResponse.json({ error: { code: "UPSTREAM_ERROR", message } }, { status: 502 });
  }

  const response = NextResponse.json({ status: "accepted" });
  response.cookies.set("va_legal_current", "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    // Deliberately much shorter than va_onboarding_done: this is a
    // freshness bound, not a "done forever" flag. Bounds how stale the
    // fast-path can get after an operator publishes a new required
    // document version — worst case, a user gets one extra bounce
    // through /legal/re-accept within this window (see ADR-003).
    maxAge: 60 * 60 * 24,
  });

  return response;
}
