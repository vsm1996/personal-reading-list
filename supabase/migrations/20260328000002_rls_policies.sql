-- Row Level Security policies for all public tables.
-- Every table is locked down to the owning user by default.
-- Supabase Auth injects auth.uid() for the current session.

-- ─── Enable RLS ───────────────────────────────────────────────────────────────

alter table public.profiles        enable row level security;
alter table public.books           enable row level security;
alter table public.shelves         enable row level security;
alter table public.user_books      enable row level security;
alter table public.reading_progress enable row level security;
alter table public.progress_history enable row level security;
alter table public.ratings         enable row level security;
alter table public.notes           enable row level security;
alter table public.reading_goals   enable row level security;
alter table public.user_preferences enable row level security;

-- ─── profiles ────────────────────────────────────────────────────────────────

create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- ─── books (global cache — readable by anyone authenticated) ─────────────────

create policy "Authenticated users can read books"
  on public.books for select
  to authenticated
  using (true);

create policy "Authenticated users can insert books"
  on public.books for insert
  to authenticated
  with check (true);

-- Books are never deleted from the cache (orphan cleanup handled by application)

-- ─── shelves ─────────────────────────────────────────────────────────────────

create policy "Users can view their own shelves"
  on public.shelves for select
  using (auth.uid() = profile_id);

create policy "Users can insert their own shelves"
  on public.shelves for insert
  with check (auth.uid() = profile_id);

create policy "Users can update their own shelves"
  on public.shelves for update
  using (auth.uid() = profile_id);

create policy "Users can delete their own custom shelves"
  on public.shelves for delete
  using (auth.uid() = profile_id and is_default = false);

-- ─── user_books ──────────────────────────────────────────────────────────────

create policy "Users can view their own library"
  on public.user_books for select
  using (auth.uid() = profile_id);

create policy "Users can add books to their library"
  on public.user_books for insert
  with check (auth.uid() = profile_id);

create policy "Users can update their own library entries"
  on public.user_books for update
  using (auth.uid() = profile_id);

create policy "Users can remove books from their library"
  on public.user_books for delete
  using (auth.uid() = profile_id);

-- ─── reading_progress ────────────────────────────────────────────────────────

create policy "Users can manage their own reading progress"
  on public.reading_progress for all
  using (
    exists (
      select 1 from public.user_books
      where user_books.id = reading_progress.user_book_id
        and user_books.profile_id = auth.uid()
    )
  );

-- ─── progress_history ────────────────────────────────────────────────────────

create policy "Users can manage their own progress history"
  on public.progress_history for all
  using (
    exists (
      select 1 from public.user_books
      where user_books.id = progress_history.user_book_id
        and user_books.profile_id = auth.uid()
    )
  );

-- ─── ratings ─────────────────────────────────────────────────────────────────

create policy "Users can manage their own ratings"
  on public.ratings for all
  using (
    exists (
      select 1 from public.user_books
      where user_books.id = ratings.user_book_id
        and user_books.profile_id = auth.uid()
    )
  );

-- ─── notes ───────────────────────────────────────────────────────────────────

create policy "Users can manage their own notes"
  on public.notes for all
  using (
    exists (
      select 1 from public.user_books
      where user_books.id = notes.user_book_id
        and user_books.profile_id = auth.uid()
    )
  );

-- ─── reading_goals ───────────────────────────────────────────────────────────

create policy "Users can manage their own reading goals"
  on public.reading_goals for all
  using (auth.uid() = profile_id);

-- ─── user_preferences ────────────────────────────────────────────────────────

create policy "Users can manage their own preferences"
  on public.user_preferences for all
  using (auth.uid() = profile_id);
