-- 0004_handle_new_user.sql
-- Automatically creates a public.profiles row whenever a new user is
-- created in auth.users (email signup or OAuth). This guarantees the
-- app never has to handle "auth user exists but profile is missing".
--
-- SECURITY DEFINER is required because this function must be able to
-- insert into public.profiles on behalf of a row owned by auth schema,
-- bypassing RLS at creation time only. It performs no other privileged
-- action and is not callable directly by clients.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
