-- Support anonymous (guest) users.
--
-- Anonymous users in Supabase have a valid JWT and auth.uid(), but no email.
-- Two changes are needed:
--   1. Make profiles.email nullable so the handle_new_user trigger doesn't
--      fail when creating a profile for an anonymous user.
--   2. Add RLS policies that use `to authenticated` (which covers both
--      regular and anonymous users) rather than relying on email being set.

-- ─── 1. Make email nullable ───────────────────────────────────────────────────

alter table public.profiles
  alter column email drop not null;

-- The unique constraint on email still applies for non-null values, which is
-- what we want — two guest accounts with null email are fine, but two
-- permanent accounts can't share an email.

-- ─── 2. Allow authenticated users (including guests) to insert their own profile ─

-- The handle_new_user trigger runs as security definer and bypasses RLS, so
-- the insert itself works. This policy covers any edge case where the app
-- needs to create a profile directly (e.g. after anonymous → permanent upgrade).
drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

-- ─── 3. Policies for all app tables — cover anonymous users ──────────────────
-- Existing policies use auth.uid() comparisons without a `to` clause, which
-- already applies to the `authenticated` role (including anonymous users).
-- Anonymous users have a real auth.uid(), so no changes are needed there.
--
-- The only gap was the nullable email above causing the trigger to fail before
-- a profile row could ever be created.
