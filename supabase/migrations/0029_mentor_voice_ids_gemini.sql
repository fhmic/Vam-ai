-- 0029_mentor_voice_ids_gemini.sql
-- Provider migration (Groq -> Gemini), anomaly fix.
--
-- Migration 0011 seeded mentors.voice_id with placeholder strings
-- ("voice-warm-male-01" etc.) that were never real provider voice
-- ids for any TTS vendor — see that migration's own file for the
-- original values. They were placeholders from day one, not a Groq-
-- specific artifact, but the Gemini provider swap (src/lib/voice/
-- provider.ts) is what surfaces the gap: 'auto' voice_gender defers
-- straight to mentor.voice_id, so without this migration every
-- /api/voice/tts call for a user on 'auto' would send a nonexistent
-- voice name to Gemini and 502.
--
-- Forward-only update, matched by the stable `slug` column (per this
-- repo's migration conventions — see docs/SETUP.md's migration
-- safety notes) rather than editing 0011 in place. Real Gemini
-- prebuilt voice names — see
-- https://ai.google.dev/gemini-api/docs/speech-generation#voices.
--
-- NOTE: as documented in src/lib/voice/provider.ts, Google's
-- name-to-gender mapping here is a best guess from each voice's short
-- character description, not a verified listen-through — confirm by
-- ear before treating this as final.

update public.mentors set voice_id = 'Puck'   where slug = 'the-coach';            -- Morgan, direct/high-energy (male)
update public.mentors set voice_id = 'Leda'   where slug = 'the-guide';            -- Ava, calm/supportive (female)
update public.mentors set voice_id = 'Aoede'  where slug = 'the-strategist';       -- Priya, balanced/analytical (female)
update public.mentors set voice_id = 'Charon' where slug = 'the-sparring-partner'; -- Jordan, practice-first (male)
