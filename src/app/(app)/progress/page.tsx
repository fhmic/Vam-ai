import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Sparkline } from "@/components/progress/sparkline";
import { CoachCompanion } from "@/components/avatar/coach-companion";
import { ProgressClient } from "./progress-client";
import { mondayOfCurrentWeek } from "@/lib/action-plans/suggest";

export default async function ProgressPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  const [
    { data: goals },
    { data: messageTrend },
    { data: streakSnapshot },
    { data: currentPlan },
    { data: assessmentScores },
  ] = await Promise.all([
    supabase
      .from("goals")
      .select("id, title, status, priority")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("progress_snapshots")
      .select("metric_value, recorded_at")
      .eq("user_id", user.id)
      .eq("metric_key", "total_messages")
      .order("recorded_at", { ascending: true })
      .limit(30),
    supabase
      .from("progress_snapshots")
      .select("metric_value")
      .eq("user_id", user.id)
      .eq("metric_key", "day_streak")
      .order("recorded_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("action_plans")
      .select("id")
      .eq("user_id", user.id)
      .eq("week_start_date", mondayOfCurrentWeek())
      .maybeSingle(),
    supabase
      .from("assessment_scores")
      .select("scores, narrative_summary, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(3),
  ]);

  let actionItems: { id: string; title: string; is_completed: boolean; is_ai_suggested: boolean }[] = [];
  if (currentPlan?.id) {
    const { data } = await supabase
      .from("action_plan_items")
      .select("id, title, is_completed, is_ai_suggested")
      .eq("action_plan_id", currentPlan.id)
      .order("sort_order", { ascending: true });
    actionItems = data ?? [];
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-ink dark:text-white">Your progress</h1>
        <Link href="/assessments" className="text-sm font-medium text-signal-600 hover:text-signal-700">
          Take an assessment →
        </Link>
      </div>

      <CoachCompanion moduleKey="progress" />

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <h2 className="text-sm font-medium text-ink/60 dark:text-white/60">Day streak</h2>
          <p className="mt-2 text-2xl font-semibold text-ink dark:text-white">{streakSnapshot?.metric_value ?? 0}</p>
        </Card>
        <Card>
          <h2 className="text-sm font-medium text-ink/60 dark:text-white/60">Messages over time</h2>
          <div className="mt-2">
            <Sparkline values={(messageTrend ?? []).map((s) => s.metric_value)} />
          </div>
        </Card>
      </div>

      {assessmentScores && assessmentScores.length > 0 ? (
        <div>
          <h2 className="mb-3 text-lg font-medium text-ink dark:text-white">Recent assessments</h2>
          <div className="space-y-3">
            {assessmentScores.map((s, i) => (
              <Card key={i}>
                <p className="text-sm text-ink dark:text-white">{s.narrative_summary}</p>
                <p className="mt-1 text-xs text-ink/40 dark:text-white/40">
                  {new Date(s.created_at).toLocaleDateString()}
                </p>
              </Card>
            ))}
          </div>
        </div>
      ) : null}

      <ProgressClient initialGoals={goals ?? []} initialActionItems={actionItems} />
    </div>
  );
}
