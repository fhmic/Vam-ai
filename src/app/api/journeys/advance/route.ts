import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyAuthenticatedUser } from "@/lib/supabase/auth-guard";
import { createAdminClient } from "@/lib/supabase/admin";

const bodySchema = z.object({ journeyId: z.string().uuid() });

interface JourneyStep {
  order: number;
  title: string;
  objective: string;
}

/**
 * Stage 4.3 — Personalised coaching journeys.
 *
 * POST { journeyId } -> starts the journey at step 1 if the user has no
 * progress row yet, otherwise advances current_step by exactly 1 (or
 * marks completed_at if already at the final step). Always server-
 * computed from the stored current_step — never accepts a client-
 * supplied step number — so a user cannot jump ahead by calling this
 * with a forged value.
 */
export async function POST(request: Request) {
  const auth = await verifyAuthenticatedUser();
  if (!auth.ok) return auth.response;
  const { user } = auth.data;

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: parsed.error.message } },
      { status: 400 },
    );
  }

  const admin = createAdminClient();

  const { data: journey, error: journeyError } = await admin
    .from("coaching_journeys")
    .select("steps")
    .eq("id", parsed.data.journeyId)
    .eq("is_active", true)
    .single();

  if (journeyError || !journey) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "Unknown or inactive journey" } },
      { status: 400 },
    );
  }

  const steps = journey.steps as unknown as JourneyStep[];
  const totalSteps = steps.length;

  const { data: existing } = await admin
    .from("user_journey_progress")
    .select("id, current_step, completed_at")
    .eq("user_id", user.id)
    .eq("journey_id", parsed.data.journeyId)
    .maybeSingle();

  if (!existing) {
    const { data: created, error: insertError } = await admin
      .from("user_journey_progress")
      .insert({ user_id: user.id, journey_id: parsed.data.journeyId, current_step: 1 })
      .select("current_step, completed_at")
      .single();
    if (insertError || !created) {
      return NextResponse.json(
        { error: { code: "UPSTREAM_ERROR", message: insertError?.message ?? "Failed to start journey" } },
        { status: 502 },
      );
    }
    return NextResponse.json(created);
  }

  if (existing.completed_at) {
    return NextResponse.json({ current_step: existing.current_step, completed_at: existing.completed_at });
  }

  const nextStep = existing.current_step + 1;
  const isNowComplete = nextStep > totalSteps;

  const { data: updated, error: updateError } = await admin
    .from("user_journey_progress")
    .update({
      current_step: isNowComplete ? existing.current_step : nextStep,
      completed_at: isNowComplete ? new Date().toISOString() : null,
    })
    .eq("id", existing.id)
    .select("current_step, completed_at")
    .single();

  if (updateError || !updated) {
    return NextResponse.json(
      { error: { code: "UPSTREAM_ERROR", message: updateError?.message ?? "Failed to advance journey" } },
      { status: 502 },
    );
  }

  return NextResponse.json(updated);
}
