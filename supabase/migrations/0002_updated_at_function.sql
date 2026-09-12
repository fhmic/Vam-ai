-- 0002_updated_at_function.sql
-- Shared trigger function to auto-maintain `updated_at` columns.
-- Reused by every table added in later phases that has an updated_at column.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
