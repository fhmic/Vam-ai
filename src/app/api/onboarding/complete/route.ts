import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyAuthenticatedUser } from "@/lib/supabase/auth-guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { CAREER_LEVELS, COUNTRIES } from "@/lib/onboarding/constants";
import {
  getRequiredLegalDocuments,
  recordLegalAcceptances,
} from "@/lib/legal/acceptance";

const PRIMARY_GOALS = [
  "Improve Confidence",
  "Executive Presence",
  "Ace Interviews",
  "Improve Presentations",
  "Improve Meetings",
  "Become More Persuasive",
  "Leadership Communication",
] as const;

const bodySchema = z.object({
  displayName: z.string().trim().min(1).max(80),
  timezone: z.string().trim().min(1).max(64),
  country: z.enum(COUNTRIES).optional(),
  organizationName: z.string().trim().max(160).optional(),
  industryId: z.string().uuid().optional(),
  functionalAreaId: z.string().uuid().optional(),
  currentRoleId: z.string().uuid().optional(),
  careerLevel: z.enum(CAREER_LEVELS).optional(),
  primaryGoal: z.enum(PRIMARY_GOALS).optional(),
  // IDs of every legal_documents row the client is asserting the user
  // agreed to. This is NOT trusted at face value — the server always
  // re-derives "what's actually required right now" (see
  // getRequiredLegalDocuments) and rejects if the client's set doesn't
  // cover it, rather than trusting the client's list as sufficient.
  acceptedDocumentIds: z.array(z.string().uuid()).default([]),
});

/**
 * Marks onboarding complete for the current session's user.
 *
 * Product Redefinition — Onboarding Overhaul: profession/experience_level
 * (Foundation Hardening Change #2) are superseded by industryId/
 * functionalAreaId/currentRoleId/careerLevel/organizationName/country.
 * industryId/functionalAreaId/currentRoleId are validated against the
 * live `is_active = true` set server-side rather than trusted at face
 * value — same "never trust a client-supplied id/reference at face
 * value" principle already applied to acceptedDocumentIds below.
 *
 * CTO Review Foundation Hardening changes still in force here:
 *   - Change #1 (Legal Acceptance System): writes one immutable
 *     legal_acceptances row per required document instead of only
 *     setting profiles.terms_accepted_at.
 *   - Change #6 (Admin Client Safety): auth is verified via the shared
 *     verifyAuthenticatedUser() guard before the admin (service-role)
 *     client is touched at all.
 *
 * `onboarding_completed_at` remains intentionally NOT client-updatable
 * via RLS column grants (see migration 0006) — this route is the only
 * path that can set it, and it always derives the user id from the
 * authenticated session, never from the request body.
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

  // Re-derive what's actually required server-side rather than trusting
  // the client's accepted-document list as sufficient on its own.
  const requiredDocuments = await getRequiredLegalDocuments(supabase);
  const acceptedIds = new Set(parsed.data.acceptedDocumentIds);
  const missingRequired = requiredDocuments.filter((doc) => !acceptedIds.has(doc.id));

  if (requiredDocuments.length > 0 && missingRequired.length > 0) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "You must accept all required agreements to continue.",
          details: { missingSlugs: missingRequired.map((d) => d.slug) },
        },
      },
      { status: 400 },
    );
  }

  const admin = createAdminClient();

  // Validate the three professional-identity foreign keys against the
  // live active set rather than trusting the client's submitted ids —
  // a stale id (an industry deactivated after the client loaded the
  // onboarding form) shouldn't silently write a dangling reference.
  const [{ data: industries }, { data: functionalAreas }, { data: currentRoles }] = await Promise.all([
    admin.from("industries").select("id").eq("is_active", true),
    admin.from("functional_areas").select("id").eq("is_active", true),
    admin.from("current_roles").select("id").eq("is_active", true),
  ]);

  const activeIndustryIds = new Set((industries ?? []).map((i) => i.id));
  const activeFunctionalAreaIds = new Set((functionalAreas ?? []).map((f) => f.id));
  const activeCurrentRoleIds = new Set((currentRoles ?? []).map((r) => r.id));

  if (parsed.data.industryId && !activeIndustryIds.has(parsed.data.industryId)) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "Unknown or inactive industry" } },
      { status: 400 },
    );
  }
  if (parsed.data.functionalAreaId && !activeFunctionalAreaIds.has(parsed.data.functionalAreaId)) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "Unknown or inactive functional area" } },
      { status: 400 },
    );
  }
  if (parsed.data.currentRoleId && !activeCurrentRoleIds.has(parsed.data.currentRoleId)) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "Unknown or inactive current role" } },
      { status: 400 },
    );
  }

  const now = new Date().toISOString();

  const { error } = await admin
    .from("profiles")
    .update({
      display_name: parsed.data.displayName,
      timezone: parsed.data.timezone,
      country: parsed.data.country ?? null,
      organization_name: parsed.data.organizationName ?? null,
      industry_id: parsed.data.industryId ?? null,
      functional_area_id: parsed.data.functionalAreaId ?? null,
      current_role_id: parsed.data.currentRoleId ?? null,
      career_level: parsed.data.careerLevel ?? null,
      primary_goal: parsed.data.primaryGoal ?? null,
      onboarding_completed_at: now,
      // Cheap "has this user accepted anything, ever" flag for simple UI
      // checks — legal_acceptances (written below) is the actual source
      // of truth, per REQUIRED_LEGAL_SLUGS / ADR-004.
      terms_accepted_at: requiredDocuments.length > 0 ? now : null,
    })
    .eq("id", user.id);

  if (error) {
    return NextResponse.json({ error: { code: "UPSTREAM_ERROR", message: error.message } }, { status: 502 });
  }

  try {
    await recordLegalAcceptances(request, user.id, requiredDocuments);
  } catch (acceptanceError) {
    const message =
      acceptanceError instanceof Error ? acceptanceError.message : "Failed to record legal acceptance";
    return NextResponse.json({ error: { code: "UPSTREAM_ERROR", message } }, { status: 502 });
  }

  // Product Redefinition — 30-Day Transformation Program: every user is
  // auto-enrolled at onboarding, not offered it as one option among
  // several (unlike the goal-specific journeys from migration 0022).
  // Failure here must never block onboarding completion itself — a
  // missing enrollment is recoverable (the /journeys page can offer a
  // manual "start" action), but a broken signup flow is not.
  try {
    const { data: program } = await admin
      .from("coaching_journeys")
      .select("id")
      .eq("slug", "thirty-day-transformation")
      .eq("is_active", true)
      .single();

    if (program) {
      await admin
        .from("user_journey_progress")
        .upsert(
          { user_id: user.id, journey_id: program.id, current_step: 1 },
          { onConflict: "user_id,journey_id", ignoreDuplicates: true },
        );
    }
  } catch {
    // Non-fatal — see comment above.
  }

  const response = NextResponse.json({ status: "completed" });
  // Fast-path hints for middleware; DB remains the source of truth for
  // both onboarding state and legal-acceptance state.
  response.cookies.set("va_onboarding_done", "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
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
