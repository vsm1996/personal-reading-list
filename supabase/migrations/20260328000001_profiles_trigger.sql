-- Auto-create a profile row in public.profiles when a new user signs up
-- via Supabase Auth (auth.users). Prisma manages the public schema schema;
-- this trigger keeps profiles in sync with auth.users without needing
-- a separate API call in the signup flow.
--
-- Run this migration in Supabase: SQL Editor > paste > Run

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, created_at, updated_at)
  values (
    new.id,
    new.email,
    now(),
    now()
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Trigger fires after every insert into auth.users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Also create the three default shelves for new users
create or replace function public.handle_new_profile()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.shelves (id, profile_id, name, position, is_default, created_at, updated_at)
  values
    (gen_random_uuid()::text, new.id, 'Want to Read',      0, true, now(), now()),
    (gen_random_uuid()::text, new.id, 'Currently Reading', 1, true, now(), now()),
    (gen_random_uuid()::text, new.id, 'Read',              2, true, now(), now());
  return new;
end;
$$;

drop trigger if exists on_profile_created on public.profiles;
create trigger on_profile_created
  after insert on public.profiles
  for each row execute procedure public.handle_new_profile();
