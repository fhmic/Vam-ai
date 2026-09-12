-- 0028_voice_sessions_bucket.sql
-- Stage 6 — Voice session storage bucket.
--
-- Voice sessions (audio recorded by the user during push-to-talk) are
-- stored as opaque blobs in a private Supabase Storage bucket. They are
-- processed server-side for STT (Whisper) and the resulting transcript
-- is what gets persisted in the `messages` table — the raw audio itself
-- is only kept long enough to be transcribed + (optionally) played back
-- for the user, then deleted by /api/internal/purge-voice-sessions
-- (configurable TTL).
--
-- Path convention: <user_id>/<session_id>.<ext>
-- The user_id prefix makes owner-scoped RLS trivial and matches the
-- pattern the rest of the codebase already uses for its storage objects
-- (avatars, collective-insights attachments).
--
-- Private bucket: no anon reads, no public URLs. Signed URLs are issued
-- by trusted server routes (api/voice/...) only.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'voice-sessions',
  'voice-sessions',
  false,
  26214400,  -- 25 MiB; well over any single push-to-talk utterance we generate
  array['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/wav', 'audio/mpeg']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Owner-scoped access: a user can read/write only objects in their own
-- folder (<user_id>/...). The `auth.uid()` text is the first path segment
-- of the object name; the `storage.objects.name` column carries the
-- full object key including that prefix.

create policy "voice_sessions_owner_select"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'voice-sessions'
    and auth.uid()::text = split_part(name, '/', 1)
  );

create policy "voice_sessions_owner_insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'voice-sessions'
    and auth.uid()::text = split_part(name, '/', 1)
  );

create policy "voice_sessions_owner_update"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'voice-sessions'
    and auth.uid()::text = split_part(name, '/', 1)
  )
  with check (
    bucket_id = 'voice-sessions'
    and auth.uid()::text = split_part(name, '/', 1)
  );

create policy "voice_sessions_owner_delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'voice-sessions'
    and auth.uid()::text = split_part(name, '/', 1)
  );
