import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, MemoryItem } from "@/types/database";

const MAX_MEMORIES_IN_PROMPT = 12;
const RECENCY_HALF_LIFE_DAYS = 30;

/**
 * Stage 2.4 — Conversation Memory retrieval.
 *
 * Ranks by importance x recency-decay. Semantic (embedding) similarity
 * to the current message is NOT part of the ranking yet — memory_items
 * has an `embedding` column (migration 0014) but no embedding provider
 * is wired up (Groq doesn't offer an embeddings endpoint; no other
 * provider has been chosen). This is a documented, deliberate gap — see
 * docs/STAGE-2-3-4-NOTES.md — not an oversight. When an embedding provider
 * is chosen, this function is the only place that needs to change.
 *
 * Pure ranking math is separated into `rankMemories` so it's unit-
 * testable without a database (tests/unit/memory-ranking.test.ts);
 * this function is the thin I/O wrapper around it.
 */
export function rankMemories(
  items: Pick<MemoryItem, "id" | "importance" | "created_at">[],
  now: Date = new Date(),
): typeof items {
  const scored = items.map((item) => {
    const ageDays = (now.getTime() - new Date(item.created_at).getTime()) / (1000 * 60 * 60 * 24);
    const recencyFactor = Math.pow(0.5, ageDays / RECENCY_HALF_LIFE_DAYS);
    return { item, score: item.importance * recencyFactor };
  });

  return scored.sort((a, b) => b.score - a.score).map((s) => s.item);
}

export async function getRelevantMemories(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<MemoryItem[]> {
  const { data, error } = await supabase
    .from("memory_items")
    .select("*")
    .eq("user_id", userId)
    .is("superseded_by", null)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    throw new Error(`getRelevantMemories: ${error.message}`);
  }

  return rankMemories(data ?? []).slice(0, MAX_MEMORIES_IN_PROMPT) as MemoryItem[];
}
