"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

interface GoalRow {
  id: string;
  title: string;
  status: string;
  priority: string;
}

interface ActionItemRow {
  id: string;
  title: string;
  is_completed: boolean;
  is_ai_suggested: boolean;
}

export function ProgressClient({
  initialGoals,
  initialActionItems,
}: {
  initialGoals: GoalRow[];
  initialActionItems: ActionItemRow[];
}) {
  const supabase = createClient();
  const [goals, setGoals] = useState(initialGoals);
  const [actionItems, setActionItems] = useState(initialActionItems);
  const [newGoalTitle, setNewGoalTitle] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  async function addGoal() {
    if (!newGoalTitle.trim()) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("goals")
      .insert({ user_id: user.id, title: newGoalTitle.trim() })
      .select("id, title, status, priority")
      .single();

    if (!error && data) {
      setGoals((prev) => [data, ...prev]);
      setNewGoalTitle("");
    }
  }

  async function toggleItem(item: ActionItemRow) {
    const nextCompleted = !item.is_completed;
    setActionItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, is_completed: nextCompleted } : i)),
    );
    await supabase
      .from("action_plan_items")
      .update({ is_completed: nextCompleted, completed_at: nextCompleted ? new Date().toISOString() : null })
      .eq("id", item.id);
  }

  async function generatePlan() {
    setIsGenerating(true);
    const res = await fetch("/api/action-plans/generate", { method: "POST" });
    setIsGenerating(false);
    if (res.ok) {
      // Simplest reliable way to reflect newly-created items server-side.
      window.location.reload();
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="mb-3 text-lg font-medium text-ink dark:text-white">Goals</h2>
        <div className="mb-3 flex gap-2">
          <Input
            value={newGoalTitle}
            onChange={(e) => setNewGoalTitle(e.target.value)}
            placeholder="Add a goal…"
            onKeyDown={(e) => e.key === "Enter" && addGoal()}
          />
          <Button onClick={addGoal} type="button">
            Add
          </Button>
        </div>
        {goals.length > 0 ? (
          <ul className="space-y-2">
            {goals.map((goal) => (
              <li key={goal.id}>
                <Card className="flex items-center justify-between py-3">
                  <span className="text-sm text-ink dark:text-white">{goal.title}</span>
                  <span className="rounded-full bg-ink/5 dark:bg-white/10 px-2.5 py-0.5 text-xs capitalize text-ink/70 dark:text-white/70">
                    {goal.status}
                  </span>
                </Card>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ink/40 dark:text-white/40">No goals yet — add one above.</p>
        )}
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-medium text-ink dark:text-white">This week&apos;s action plan</h2>
          <Button variant="secondary" size="sm" onClick={generatePlan} isLoading={isGenerating}>
            {actionItems.length > 0 ? "Regenerate" : "Generate from my goals"}
          </Button>
        </div>
        {actionItems.length > 0 ? (
          <ul className="space-y-2">
            {actionItems.map((item) => (
              <li key={item.id}>
                <Card className="flex items-center gap-3 py-3">
                  <input
                    type="checkbox"
                    checked={item.is_completed}
                    onChange={() => toggleItem(item)}
                    className="h-4 w-4 rounded border-ink/20 dark:border-white/20"
                  />
                  <span className={`flex-1 text-sm ${item.is_completed ? "text-ink/40 dark:text-white/40 line-through" : "text-ink dark:text-white"}`}>
                    {item.title}
                  </span>
                  {item.is_ai_suggested ? (
                    <span className="text-xs text-ink/40 dark:text-white/40">suggested</span>
                  ) : null}
                </Card>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ink/40 dark:text-white/40">
            No plan yet this week. Add a goal above, then generate a plan from it.
          </p>
        )}
      </div>
    </div>
  );
}
