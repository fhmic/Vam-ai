import "server-only";
import { z } from "zod";
import { completeJson } from "@/lib/groq/client";
import { createAdminClient } from "@/lib/supabase/admin";

const suggestionResultSchema = z.object({
  items: z.array(z.string().min(1).max(200)).min(1).max(7),
});

const SUGGESTION_SYSTEM_PROMPT = `You suggest 3-5 concrete, specific action items for this week based on
the user's active goals. Each item should be doable within a week and
phrased as a single concrete action, not a vague aspiration. Respond
ONLY with JSON: {"items": ["...", "..."]}`;

/**
 * Stage 3.2 — Weekly action plans.
 *
 * Finds or creates this week's action_plan (Monday-anchored, UTC) and
 * populates it with Groq-suggested items (is_ai_suggested = true) if it
 * doesn't have any yet. Never overwrites a plan that already has items —
 * calling this twice in the same week is a safe no-op after the first
 * successful generation.
 */
export async function generateWeeklyActionPlan(params: {
  userId: string;
  utilityModel: string;
}): Promise<{ planId: string; itemsCreated: number }> {
  const admin = createAdminClient();
  const weekStart = mondayOfCurrentWeek();

  const { data: existingPlan } = await admin
    .from("action_plans")
    .select("id")
    .eq("user_id", params.userId)
    .eq("week_start_date", weekStart)
    .maybeSingle();

  let planId = existingPlan?.id;

  if (!planId) {
    const { data: newPlan, error: planError } = await admin
      .from("action_plans")
      .insert({ user_id: params.userId, week_start_date: weekStart })
      .select("id")
      .single();
    if (planError || !newPlan) {
      throw new Error(`generateWeeklyActionPlan: failed to create plan: ${planError?.message}`);
    }
    planId = newPlan.id;
  } else {
    const { count } = await admin
      .from("action_plan_items")
      .select("id", { count: "exact", head: true })
      .eq("action_plan_id", planId);
    if (count && count > 0) {
      return { planId, itemsCreated: 0 };
    }
  }

  const { data: goals } = await admin
    .from("goals")
    .select("title")
    .eq("user_id", params.userId)
    .eq("status", "active");

  if (!goals || goals.length === 0) {
    return { planId, itemsCreated: 0 };
  }

  const raw = await completeJson<unknown>({
    model: params.utilityModel,
    messages: [
      { role: "system", content: SUGGESTION_SYSTEM_PROMPT },
      { role: "user", content: `Active goals:\n${goals.map((g) => `- ${g.title}`).join("\n")}` },
    ],
  });

  const parsed = suggestionResultSchema.safeParse(raw);
  if (!parsed.success) {
    return { planId, itemsCreated: 0 };
  }

  const { error: insertError } = await admin.from("action_plan_items").insert(
    parsed.data.items.map((title, i) => ({
      action_plan_id: planId as string,
      user_id: params.userId,
      title,
      is_ai_suggested: true,
      sort_order: i,
    })),
  );

  if (insertError) {
    throw new Error(`generateWeeklyActionPlan: insert failed: ${insertError.message}`);
  }

  return { planId, itemsCreated: parsed.data.items.length };
}

/** Pure — unit-testable. Monday-anchored week start, UTC, ISO date (YYYY-MM-DD). */
export function mondayOfCurrentWeek(now: Date = new Date()): string {
  const day = now.getUTCDay(); // 0 = Sunday
  const diffToMonday = day === 0 ? 6 : day - 1;
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - diffToMonday));
  return monday.toISOString().slice(0, 10);
}
