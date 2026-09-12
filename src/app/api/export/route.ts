import { NextResponse } from "next/server";
import { verifyAuthenticatedUser } from "@/lib/supabase/auth-guard";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Stage 5 — data export.
 *
 * Closes a gap flagged as far back as the original Phase 1A CTO Review
 * Pack ("no account deletion / data export endpoints yet"). Returns a
 * JSON snapshot of every table the user owns data in. Uses the admin
 * client only to run one query per table cleanly in parallel — every
 * query is still explicitly scoped to auth.data.user.id, never a
 * client-supplied id, consistent with every other admin-client call
 * site in this codebase.
 */
export async function GET() {
  const auth = await verifyAuthenticatedUser();
  if (!auth.ok) return auth.response;
  const { user } = auth.data;

  const admin = createAdminClient();

  const [
    profile,
    preferences,
    goals,
    actionPlans,
    actionPlanItems,
    messages,
    memoryItems,
    assessmentResponses,
    assessmentScores,
    journeyProgress,
    legalAcceptances,
    collectiveIntelligenceConsent,
  ] = await Promise.all([
    admin.from("profiles").select("*").eq("id", user.id).single(),
    admin.from("user_preferences").select("*").eq("user_id", user.id).single(),
    admin.from("goals").select("*").eq("user_id", user.id),
    admin.from("action_plans").select("*").eq("user_id", user.id),
    admin.from("action_plan_items").select("*").eq("user_id", user.id),
    admin.from("messages").select("role, content, created_at").eq("user_id", user.id),
    admin.from("memory_items").select("type, content, importance, created_at").eq("user_id", user.id),
    admin.from("assessment_responses").select("*").eq("user_id", user.id),
    admin.from("assessment_scores").select("*").eq("user_id", user.id),
    admin.from("user_journey_progress").select("*").eq("user_id", user.id),
    admin.from("legal_acceptances").select("document_id, accepted_at").eq("user_id", user.id),
    admin.from("collective_intelligence_consents").select("*").eq("user_id", user.id).maybeSingle(),
  ]);

  const exportData = {
    exported_at: new Date().toISOString(),
    profile: profile.data,
    preferences: preferences.data,
    goals: goals.data ?? [],
    action_plans: actionPlans.data ?? [],
    action_plan_items: actionPlanItems.data ?? [],
    messages: messages.data ?? [],
    memory_items: memoryItems.data ?? [],
    assessment_responses: assessmentResponses.data ?? [],
    assessment_scores: assessmentScores.data ?? [],
    journey_progress: journeyProgress.data ?? [],
    legal_acceptances: legalAcceptances.data ?? [],
    collective_intelligence_consent: collectiveIntelligenceConsent.data,
  };

  return new Response(JSON.stringify(exportData, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="vam-data-export-${user.id}.json"`,
    },
  });
}
