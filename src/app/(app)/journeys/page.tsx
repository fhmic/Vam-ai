import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { JourneysClient } from "./journeys-client";
import { CoachCompanion } from "@/components/avatar/coach-companion";

interface JourneyStep {
  order: number;
  title: string;
  objective: string;
  week?: number;
  module?: string;
}

export default async function JourneysPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  const [{ data: journeys }, { data: progress }] = await Promise.all([
    supabase.from("coaching_journeys").select("id, slug, title, description, steps").eq("is_active", true),
    supabase.from("user_journey_progress").select("journey_id, current_step, completed_at").eq("user_id", user.id),
  ]);

  const progressByJourney = new Map((progress ?? []).map((p) => [p.journey_id, p]));

  const journeyData = (journeys ?? [])
    .map((j) => ({
      id: j.id,
      slug: j.slug,
      title: j.title,
      description: j.description,
      steps: j.steps as unknown as JourneyStep[],
      progress: progressByJourney.get(j.id) ?? null,
    }))
    .sort((a, b) => (a.slug === "thirty-day-transformation" ? -1 : b.slug === "thirty-day-transformation" ? 1 : 0));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-ink dark:text-white">Coaching journeys</h1>
      <CoachCompanion moduleKey="journeys" />
      <JourneysClient journeys={journeyData} />
    </div>
  );
}
