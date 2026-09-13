import "server-only";
import type { Mentor, UserPreferences } from "@/types/database";

/**
 * Stage 2.5 — Voice Layer.
 *
 * Maps a mentor + the user's voice_gender preference to an actual
 * provider voice id. Abstracted behind this one function (per the
 * Phase 1 blueprint's Section 9.2 "VoiceProvider interface" guidance)
 * so the underlying TTS vendor/voice catalog can change without
 * touching /api/voice/tts's call site.
 *
 * Gemini migration anomaly fix: the voice id strings here were previously
 * literal placeholders (e.g. "voice-warm-male-01") that don't
 * correspond to any real provider voice — they'd have 502'd on the
 * first real /api/voice/tts call regardless of which provider was
 * configured. They're now real Gemini prebuilt voice names (Gemini's
 * TTS models ship ~30 named voices — Kore, Puck, Charon, Aoede, Fenrir,
 * Leda, Orus, Zephyr, and more — see
 * https://ai.google.dev/gemini-api/docs/speech-generation#voices).
 *
 * IMPORTANT: Google does not publish a strict gender label per voice,
 * only a name and a short character description (e.g. "Puck — Upbeat",
 * "Kore — Firm"). The male/female pairing below is a reasonable
 * starting guess from those descriptions, not a verified mapping —
 * confirm by actually listening to each candidate voice (Google AI
 * Studio's speech-generation playground is the fastest way) before
 * treating this as final, and swap either name below if it doesn't
 * match what "male"/"female" should sound like for this product.
 *
 * user_preferences.voice_gender always wins over the mentor's own
 * voice_id when set to 'male' or 'female' — this is the mechanism
 * behind the requirement that voice choice is a user preference,
 * independent of which mentor is assigned. 'auto' (the default) defers
 * to the mentor's own voice_id.
 */

const FALLBACK_VOICE_BY_GENDER: Record<"male" | "female", string> = {
  male: "Puck",
  female: "Kore",
};

/**
 * Gemini voice names have no consistent naming convention to pattern-
 * match against (unlike the old placeholder scheme's "-male-"/"-female-"
 * suffix), so there's no reliable way to tell whether an arbitrary
 * mentor.voice_id already matches a requested gender preference the
 * way the old placeholder-based logic could. Until mentor voice ids are
 * curated into an explicit { name, gender } table, a requested
 * voice_gender preference always wins outright — simpler and correct,
 * at the cost of not preferring a mentor's own configured voice when it
 * happens to already match.
 */
export function resolveVoiceId(mentor: Mentor, voiceGender: UserPreferences["voice_gender"]): string {
  if (voiceGender === "male" || voiceGender === "female") {
    return FALLBACK_VOICE_BY_GENDER[voiceGender];
  }

  return mentor.voice_id;
}
