import "server-only";
import { z } from "zod";
import { completeJson } from "@/lib/groq/client";
import { createAdminClient } from "@/lib/supabase/admin";
import type { MemoryItem } from "@/types/database";

export const CONSOLIDATION_THRESHOLD = 30;

const consolidationResultSchema = z.object({
  summaries: z.array(
    z.object({
      content: z.string().min(1).max(500),
      importance: z.number().min(0).max(1),
    }),
  ),
});

const CONSOLIDATION_SYSTEM_PROMPT = `You consolidate a list of small memory notes about a user into fewer,
denser summary notes, preserving every distinct fact/preference/goal
reference — do not drop information, merge overlapping or related
items into a single well-written sentence each. Respond ONLY with JSON:
{"summaries": [{"content": string, "importance": number between 0 and 1}]}`;

/**
 * Stage 3.3 — "Better memory".
 *
 * Once a user has more than CONSOLIDATION_THRESHOLD active (non-
 * superseded) memory items, this synthesizes them into a smaller set of
 * `episodic_summary` items via Groq, then marks every consolidated item
 * as superseded_by the new summary rows. This is the mechanism the
 * Phase 1 blueprint's Section 6.4 called "prune_low_importance_memory",
 * implemented as an on-demand consolidation rather than a separate
 * cron job (see docs/STAGE-2-3-4-NOTES.md's note on synchronous vs queued
 * jobs — same tradeoff applies here).
 *
 * Superseded items are never deleted — `superseded_by` preserves the
 * full history, consistent with the append-only-plus-supersession
 * pattern already used for legal_documents/legal_acceptances.
 */
export async function consolidateMemoriesIfNeeded(params: {
  userId: string;
  utilityModel: string;
}): Promise<{ consolidated: boolean; summaryCount: number }> {
  const admin = createAdminClient();

  const { data: activeItems, error } = await admin
    .from("memory_items")
    .select("*")
    .eq("user_id", params.userId)
    .is("superseded_by", null)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`consolidateMemoriesIfNeeded: ${error.message}`);
  }

  if (!activeItems || activeItems.length <= CONSOLIDATION_THRESHOLD) {
    return { consolidated: false, summaryCount: 0 };
  }

  const itemsText = activeItems.map((m) => `(${m.type}) ${m.content}`).join("\n");

  const raw = await completeJson<unknown>({
    model: params.utilityModel,
    messages: [
      { role: "system", content: CONSOLIDATION_SYSTEM_PROMPT },
      { role: "user", content: itemsText },
    ],
  });

  const parsed = consolidationResultSchema.safeParse(raw);
  if (!parsed.success || parsed.data.summaries.length === 0) {
    return { consolidated: false, summaryCount: 0 };
  }

  const { data: newSummaries, error: insertError } = await admin
    .from("memory_items")
    .insert(
      parsed.data.summaries.map((s) => ({
        user_id: params.userId,
        type: "episodic_summary" as const,
        content: s.content,
        importance: s.importance,
      })),
    )
    .select("id");

  if (insertError || !newSummaries) {
    throw new Error(`consolidateMemoriesIfNeeded: insert failed: ${insertError?.message}`);
  }

  // All consolidated items point at the first new summary row — good
  // enough for "this is why you no longer see these individually" audit
  // purposes; a many-to-many supersession map would be over-engineering
  // for what this is used for (context-window management, not legal audit).
  const primarySummaryId = newSummaries[0]?.id;
  const idsToSupersede = activeItems.map((m: MemoryItem) => m.id);

  const { error: updateError } = await admin
    .from("memory_items")
    .update({ superseded_by: primarySummaryId })
    .in("id", idsToSupersede);

  if (updateError) {
    throw new Error(`consolidateMemoriesIfNeeded: supersede update failed: ${updateError.message}`);
  }

  return { consolidated: true, summaryCount: parsed.data.summaries.length };
}
