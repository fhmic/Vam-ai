import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyAuthenticatedUser } from "@/lib/supabase/auth-guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOrAssignMentor } from "@/lib/mentor/assignment";
import { loadSystemPrompt } from "@/lib/chat/prompt-context";
import { persistMentorReply } from "@/lib/chat/persist-reply";
import { streamChatCompletion, type GroqMessage } from "@/lib/groq/client";

const bodySchema = z.object({
  sessionId: z.string().uuid().nullable(),
  message: z.string().trim().min(1).max(4000),
  inputMode: z.enum(["text", "voice"]).default("text"),
});

const SHORT_TERM_CONTEXT_MESSAGES = 20;

/**
 * Stage 2.3 — Groq Integration / Stage 2.1 — Mentor Domain Model.
 *
 * POST { sessionId: string | null, message: string, inputMode }
 * -> text/event-stream of the mentor's reply, terminated by the raw
 *    Groq SSE stream ending (this proxies Groq's stream directly rather
 *    than re-framing it — the client is expected to parse Groq's
 *    `data: {...}` SSE lines the same way it would talking to Groq
 *    directly, since this route is a transparent proxy plus persistence,
 *    not a protocol translator).
 *
 * A null sessionId creates a new conversation_session, assigning a
 * mentor via getOrAssignMentor() if the user doesn't have one yet.
 *
 * See /api/chat/greet/route.ts for the proactive-opening counterpart
 * (Product Redefinition — Mentor Redefinition) — this route always
 * expects a real user message; greet never does.
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
  const { sessionId, message, inputMode } = parsed.data;

  const chatModel = process.env.GROQ_MODEL_CHAT;
  const utilityModel = process.env.GROQ_MODEL_UTILITY;
  if (!chatModel || !utilityModel) {
    return NextResponse.json(
      { error: { code: "UPSTREAM_ERROR", message: "Groq model configuration is missing" } },
      { status: 502 },
    );
  }

  const admin = createAdminClient();

  try {
    const mentor = await getOrAssignMentor(user.id);

    let activeSessionId = sessionId;
    if (!activeSessionId) {
      const { data: session, error: sessionError } = await admin
        .from("conversation_sessions")
        .insert({ user_id: user.id, mentor_id: mentor.id })
        .select("id")
        .single();
      if (sessionError || !session) {
        throw new Error(`failed to create session: ${sessionError?.message}`);
      }
      activeSessionId = session.id;
    }

    const [systemPrompt, { data: history }] = await Promise.all([
      loadSystemPrompt(admin, user.id, mentor),
      admin
        .from("messages")
        .select("role, content")
        .eq("session_id", activeSessionId)
        .order("created_at", { ascending: false })
        .limit(SHORT_TERM_CONTEXT_MESSAGES),
    ]);

    const { error: userMessageError } = await admin.from("messages").insert({
      session_id: activeSessionId,
      user_id: user.id,
      role: "user",
      content: message,
      input_mode: inputMode,
    });
    if (userMessageError) {
      throw new Error(`failed to persist user message: ${userMessageError.message}`);
    }

    const shortTermContext: GroqMessage[] = (history ?? [])
      .slice()
      .reverse()
      .map((m) => ({
        role: m.role === "mentor" ? "assistant" : m.role === "system" ? "system" : "user",
        content: m.content,
      }));

    const groqResponse = await streamChatCompletion({
      model: chatModel,
      messages: [
        { role: "system", content: systemPrompt },
        ...shortTermContext,
        { role: "user", content: message },
      ],
      // Stage 6 barge-in: if the client aborts this fetch (user started
      // talking over the mentor), that cancellation propagates here and
      // actually stops the upstream Groq generation, rather than just
      // the client ignoring a reply that's still being generated and
      // billed for server-side.
      signal: request.signal,
    });

    // Tee the upstream stream: one branch goes to the client immediately,
    // the other is buffered server-side so the full reply can be
    // persisted once streaming completes.
    const [clientStream, persistStream] = groqResponse.body!.tee();

    void persistMentorReply({
      admin,
      sessionId: activeSessionId,
      userId: user.id,
      utilityModel,
      stream: persistStream,
    });

    await admin
      .from("conversation_sessions")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", activeSessionId);

    return new Response(clientStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-Session-Id": activeSessionId,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: { code: "UPSTREAM_ERROR", message } }, { status: 502 });
  }
}
