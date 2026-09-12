import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { CurrentProgramDay } from "@/lib/recommendations/next-action";

interface ProgramStep {
  order: number;
  week: number;
  title: string;
  objective: string;
}

/**
 * Works with either the RLS-scoped server client (dashboard reading
 * its own user's data) or the admin client (prompt-context.ts) — both
 * are SupabaseClient<Database>, and the query itself is owner-scoped
 * via .eq("user_id", userId) either way.
 */
export async function getCurrentProgramDay(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<CurrentProgramDay | null> {
  const { data: programProgress } = await supabase
    .from("user_journey_progress")
    .select("current_step, completed_at, coaching_journeys(slug, steps)")
    .eq("user_id", userId)
    .is("completed_at", null)
    .maybeSingle();

  // Supabase's relational embed typing isn't fully resolved for this
  // hand-authored Database type; narrowed here rather than fighting it.
  const journey = (programProgress as any)?.coaching_journeys;
  if (journey?.slug !== "thirty-day-transformation") return null;

  const steps = journey.steps as ProgramStep[];
  const currentStep = steps.find((step) => step.order === programProgress?.current_step);
  if (!currentStep) return null;

  return {
    dayNumber: currentStep.order,
    week: currentStep.week,
    title: currentStep.title,
    objective: currentStep.objective,
  };
}
