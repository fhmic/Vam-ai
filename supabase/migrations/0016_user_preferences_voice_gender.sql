-- 0016_user_preferences_voice_gender.sql
-- Stage 2.5 — Voice Layer.
--
-- The mentor persona (mentors.voice_id) suggests a default voice, but
-- the user must always be able to override it independent of which
-- mentor is assigned — this column is that override. 'auto' defers to
-- the assigned mentor's own voice_id; 'male'/'female' force a specific
-- voice regardless of mentor. See src/lib/voice/provider.ts.

alter table public.user_preferences
  add column if not exists voice_gender text not null default 'auto'
    check (voice_gender in ('auto', 'male', 'female'));
