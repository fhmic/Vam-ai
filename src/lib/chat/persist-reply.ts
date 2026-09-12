import { createAdminClient } from "@/lib/supabase/admin";
import { extractMemoriesFromMessages } from "@/lib/memory/extraction";
import { consolidateMemoriesIfNeeded } from "@/lib/memory/consolidation";
import { recordActivitySnapshot } from "@/lib/progress/activity";

const MEMORY_EXTRACTION_TRIGGER_EVERY_N_MESSAGES = 6;

/**
 * Buffers the Groq SSE stream to reconstruct the full assistant reply,
 * persists it, then (every N messages) triggers memory extraction.
 * Runs after the response has already been returned to the client —
 * failures here are logged, never surfaced to the user, per
 * extractMemoriesFromMessages's documented contract.
 *
 * `recordActivity` defaults to true; /api/chat/greet passes false for
 * its proactive-opening message, since that message isn't user
 * activity to count toward the day streak — the user hasn't done
 * anything yet, the mentor just spoke first.
 */
export async function persistMentorReply(params: {
  admin: ReturnType<typeof createAdminClient>;
  sessionId: string;
  userId: string;
  utilityModel: string;
  stream: ReadableStream<Uint8Array>;
  recordActivity?: boolean;
}) {
  try {
    const text = await readGroqSseText(params.stream);
    if (!text) return;

    await params.admin.from("messages").insert({
      session_id: params.sessionId,
      user_id: params.userId,
      role: "mentor",
      content: text,
    });

    if (params.recordActivity !== false) {
      await recordActivitySnapshot(params.userId);
    }

    const { count } = await params.admin
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("session_id", params.sessionId);

    if (count && count % MEMORY_EXTRACTION_TRIGGER_EVERY_N_MESSAGES === 0) {
      const { data: recent } = await params.admin
        .from("messages")
        .select("role, content")
        .eq("session_id", params.sessionId)
        .order("created_at", { ascending: false })
        .limit(MEMORY_EXTRACTION_TRIGGER_EVERY_N_MESSAGES);

      await extractMemoriesFromMessages({
        userId: params.userId,
        utilityModel: params.utilityModel,
        recentMessages: (recent ?? []).slice().reverse(),
      });

      await consolidateMemoriesIfNeeded({
        userId: params.userId,
        utilityModel: params.utilityModel,
      });
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("persistMentorReply failed:", err);
  }
}

/** Parses Groq's `data: {...}` SSE chunks and concatenates the delta text. */
export async function readGroqSseText(stream: ReadableStream<Uint8Array>): Promise<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let full = "";

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const payload = trimmed.slice("data:".length).trim();
      if (payload === "[DONE]") continue;
      try {
        const json = JSON.parse(payload);
        const delta: string | undefined = json?.choices?.[0]?.delta?.content;
        if (delta) full += delta;
      } catch {
        // Ignore malformed SSE chunks rather than failing the whole read.
      }
    }
  }

  return full;
}
