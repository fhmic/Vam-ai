import "server-only";
import { z } from "zod";
import { completeJson } from "@/lib/groq/client";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Message } from "@/types/database";

const extractionResultSchema = z.object({
  items: z.array(
    z.object({
      type: z.enum(["fact", "preference", "goal_reference", "episodic_summary"]),
      content: z.string().min(1).max(500),
      importance: z.number().min(0).max(1),
    }),
  ),
});

const EXTRACTION_SYSTEM_PROMPT = `You extract durable facts worth remembering about a user from a coaching
conversation. Only extract things likely to still be true/relevant weeks
from now (stated goals, communication preferences, recurring
situations, biographical facts) — never extract one-off pleasantries or
the mentor's own advice. Respond ONLY with JSON matching this shape,
nothing else:
{"items": [{"type": "fact"|"preference"|"goal_reference"|"episodic_summary", "content": string, "importance": number between 0 and 1}]}
Return {"items": []} if nothing durable is worth remembering.`;

/**
 * Stage 2.4 — Conversation Memory extraction.
 *
 * Called after a chat completion finishes (see /api/chat/route.ts).
 * Intentionally synchronous/inline for Stage 2 rather than a queued
 * background job — the Phase 1 blueprint's Section 6.4 describes this
 * as a queued Postgres/pg_cron job for later; wiring real async job
 * infrastructure is out of scope here and would be premature before
 * Groq usage patterns are validated.
 *
 * A failure here must never fail the chat response itself — the caller
 * is expected to catch and log, not surface this to the user (a memory
 * extraction failure means "the mentor didn't learn something new",
 * not "the conversation failed").
 */
export async function extractMemoriesFromMessages(params: {
  userId: string;
  utilityModel: string;
  recentMessages: Pick<Message, "role" | "content">[];
}): Promise<number> {
  if (params.recentMessages.length === 0) {
    return 0;
  }

  const transcript = params.recentMessages
    .map((m) => `${m.role}: ${m.content}`)
    .join("\n");

  const raw = await completeJson<unknown>({
    model: params.utilityModel,
    messages: [
      { role: "system", content: EXTRACTION_SYSTEM_PROMPT },
      { role: "user", content: transcript },
    ],
  });

  const parsed = extractionResultSchema.safeParse(raw);
  if (!parsed.success || parsed.data.items.length === 0) {
    return 0;
  }

  const admin = createAdminClient();
  const { error } = await admin.from("memory_items").insert(
    parsed.data.items.map((item) => ({
      user_id: params.userId,
      type: item.type,
      content: item.content,
      importance: item.importance,
    })),
  );

  if (error) {
    throw new Error(`extractMemoriesFromMessages: insert failed: ${error.message}`);
  }

  return parsed.data.items.length;
}
