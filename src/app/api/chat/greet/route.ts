import { NextResponse } from "next/server";
import { verifyAuthenticatedUser } from "@/lib/supabase/auth-guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOrAssignMentor } from "@/lib/mentor/assignment";
import { loadSystemPrompt, loadProgressSummary } from "@/lib/chat/prompt-context";
import { persistMentorReply } from "@/lib/chat/persist-reply";
import { buildOpeningTurnDirective } from "@/lib/groq/prompts";
import { streamChatCompletion } from "@/lib/groq/client";

/**
 * Product Redefinition — Mentor Redefinition, proactive opening.
 *
 * POST { sessionId: string | null } -> text/event-stream of the
 * mentor's proactive opening message.
 *
 * The brief is explicit that the mentor "must proactively guide the
 * user" and gives a concrete example: naming who they are, their
 * objective, referencing recent progress, and closing with a specific
 * time-boxed challenge — never a passive "what can I help you with
 * today?" This route is what makes that the *first* thing a user sees
 * in a session, rather than an empty chat waiting for them to speak
 * first.
 *
 * Only called by the client when a session has zero messages
 * (mentor-chat.tsx checks this) — calling it on a session that
 * already has history would just inject an out-of-place greeting
 * mid-conversation, so this route doesn't try to guard against that
 * itself; the client owns deciding *when* to greet.
 *
 * Unlike /api/chat, there is no real user message here — the "kick
 * off" directive (buildOpeningTurnDirective) is synthetic, sent as the
 * user-role turn to Groq but never persisted as a messages row and
 * never shown in the UI. Only the mentor's resulting reply is
 * persisted. recordActivity is explicitly false when persisting it —
 * the user hasn't done anything yet, the mentor spoke first, so this
 * shouldn't count toward their day streak.
 */
export async function POST(request: Request) {
  const auth = await verifyAuthenticatedUser();
  if (!auth.ok) return auth.response;
  const { user } = auth.data;

  const body = await request.json().catch(() => ({}));
  const sessionId: string | null = typeof body?.sessionId === "string" ? body.sessionId : null;

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

    const [systemPrompt, progress] = await Promise.all([
      loadSystemPrompt(admin, user.id, mentor),
      loadProgressSummary(admin, user.id),
    ]);

    const openingDirective = buildOpeningTurnDirective(progress);

    const groqResponse = await streamChatCompletion({
      model: chatModel,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: openingDirective },
      ],
      signal: request.signal,
    });

    const [clientStream, persistStream] = groqResponse.body!.tee();

    void persistMentorReply({
      admin,
      sessionId: activeSessionId,
      userId: user.id,
      utilityModel,
      stream: persistStream,
      recordActivity: false,
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
