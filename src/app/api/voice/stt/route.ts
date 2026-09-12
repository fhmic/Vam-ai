import { NextResponse } from "next/server";
import { verifyAuthenticatedUser } from "@/lib/supabase/auth-guard";
import { transcribeAudio } from "@/lib/groq/client";
import { checkRateLimit, rateLimitResponse, VOICE_RATE_LIMIT } from "@/lib/api/rate-limit";
import { reportApiError } from "@/lib/observability/error-reporting";

/**
 * Stage 2.5 — Voice Layer (speech-to-text).
 *
 * POST multipart/form-data { audio: Blob } -> { transcript: string }
 * Push-to-talk only (Phase 1 blueprint Section 9.1) — the client
 * records a full utterance, then posts it here once, rather than a
 * continuous duplex stream.
 */
export async function POST(request: Request) {
  const auth = await verifyAuthenticatedUser();
  if (!auth.ok) return auth.response;
  const { user } = auth.data;

  // Stage 6.1 — shared with /api/voice/tts: both are "voice
  // conversions" against the same 100/hour budget from ROADMAP.md.
  const rateLimit = checkRateLimit(`voice:${user.id}`, VOICE_RATE_LIMIT);
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit);

  const sttModel = process.env.GROQ_MODEL_STT;
  if (!sttModel) {
    return NextResponse.json(
      { error: { code: "UPSTREAM_ERROR", message: "Speech-to-text model configuration is missing" } },
      { status: 502 },
    );
  }

  const form = await request.formData().catch(() => null);
  const audio = form?.get("audio");
  if (!audio || !(audio instanceof Blob)) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "Missing audio file" } },
      { status: 400 },
    );
  }

  const MAX_AUDIO_BYTES = 15 * 1024 * 1024;
  if (audio.size > MAX_AUDIO_BYTES) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "Audio file too large" } },
      { status: 400 },
    );
  }

  try {
    const result = await transcribeAudio({
      model: sttModel,
      audio,
      filename: "voice-note.webm",
    });
    return NextResponse.json({ transcript: result.text });
  } catch (err) {
    reportApiError(err, { route: "voice/stt", userId: user.id });
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: { code: "UPSTREAM_ERROR", message } }, { status: 502 });
  }
}
