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
 * IMPORTANT: the specific voice id strings below are placeholders
 * (e.g. "voice-warm-male-01") and must be replaced with real voice
 * identifiers from whichever TTS provider is actually configured before
 * this is used against a live API — this repo does not have network
 * access to any TTS provider to verify real voice ids against.
 *
 * user_preferences.voice_gender always wins over the mentor's own
 * voice_id when set to 'male' or 'female' — this is the mechanism
 * behind the requirement that voice choice is a user preference,
 * independent of which mentor is assigned. 'auto' (the default) defers
 * to the mentor's own voice_id.
 */

const FALLBACK_VOICE_BY_GENDER: Record<"male" | "female", string> = {
  male: "voice-warm-male-01",
  female: "voice-warm-female-01",
};

export function resolveVoiceId(mentor: Mentor, voiceGender: UserPreferences["voice_gender"]): string {
  if (voiceGender === "male" || voiceGender === "female") {
    // If the mentor's own configured voice already matches the
    // requested gender, prefer it (keeps the mentor's specific voice
    // rather than always falling back to the generic default for that
    // gender). Voice id naming convention: "voice-<tone>-<gender>-<n>".
    if (mentor.voice_id.includes(`-${voiceGender}-`)) {
      return mentor.voice_id;
    }
    return FALLBACK_VOICE_BY_GENDER[voiceGender];
  }

  return mentor.voice_id;
}
