import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyAuthenticatedUser } from "@/lib/supabase/auth-guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOrAssignMentor } from "@/lib/mentor/assignment";
import { resolveVoiceId } from "@/lib/voice/provider";
import { synthesizeSpeech } from "@/lib/groq/client";

const bodySchema = z.object({
  text: z.string().trim().min(1).max(4000),
});

/**
 * Stage 2.5 — Voice Layer (text-to-speech).
 *
 * POST { text: string } -> audio/mpeg
 *
 * Voice selection always re-reads the user's current voice_gender
 * preference and mentor assignment server-side — never trusts a
 * client-supplied voice id — so switching the preference in settings
 * takes effect on the very next reply with no client-side state to
 * keep in sync.
 */
export async function POST(request: Request) {
  const auth = await verifyAuthenticatedUser();
  if (!auth.ok) return auth.response;
  const { user } = auth.data;

  const ttsModel = process.env.GROQ_MODEL_TTS;
  if (!ttsModel) {
    return NextResponse.json(
      { error: { code: "UPSTREAM_ERROR", message: "Text-to-speech model configuration is missing" } },
      { status: 502 },
    );
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: parsed.error.message } },
      { status: 400 },
    );
  }

  try {
    const admin = createAdminClient();
    const [mentor, { data: preferences }] = await Promise.all([
      getOrAssignMentor(user.id),
      admin.from("user_preferences").select("voice_gender, tts_speed").eq("user_id", user.id).single(),
    ]);

    if (!preferences) {
      throw new Error("failed to load voice preferences");
    }

    const voice = resolveVoiceId(mentor, preferences.voice_gender);
    const audio = await synthesizeSpeech({
      model: ttsModel,
      voice,
      input: parsed.data.text,
      speed: preferences.tts_speed,
    });

    return new Response(audio, { headers: { "Content-Type": "audio/mpeg" } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: { code: "UPSTREAM_ERROR", message } }, { status: 502 });
  }
}
