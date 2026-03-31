"use client";

/**
 * All interactive actions for the book detail page live here so we
 * have a single "use client" boundary — the page itself stays a Server Component.
 *
 * State and API calls are delegated to useBookMutations; this file is
 * responsible only for rendering the panel sections.
 */

import { useBookMutations } from "@/hooks/use-book-mutations";

type Shelf = { id: string; name: string };

type Props = {
  userBookId: string;
  pageCount: number | null;
  initialShelfId: string;
  initialProgress: { currentPage: number; percentage: number } | null;
  initialRating: number | null;
  initialNote: string | null;
  initialDateFinished: string | null;
  shelves: Shelf[];
};

export function BookDetailPanel({
  userBookId,
  pageCount,
  initialShelfId,
  initialProgress,
  initialRating,
  initialNote,
  initialDateFinished,
  shelves,
}: Props) {
  const mutations = useBookMutations({
    userBookId,
    initialShelfId,
    initialProgress,
    initialRating,
    initialNote,
    initialDateFinished,
  });

  return (
    <div className="space-y-6">
      {mutations.error && (
        <p className="rounded-md bg-error/10 px-3 py-2 text-xs text-error">
          {mutations.error}
        </p>
      )}

      <ShelfSelector shelves={shelves} mutations={mutations} />
      <ProgressTracker pageCount={pageCount} mutations={mutations} />
      <RatingStars mutations={mutations} />
      <NoteEditor mutations={mutations} />
      <StatusActions mutations={mutations} />
    </div>
  );
}

// ─── Section sub-components ────────────────────────────────────────────────────

type M = ReturnType<typeof useBookMutations>;

function ShelfSelector({ shelves, mutations: m }: { shelves: Shelf[]; mutations: M }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-text-tertiary">
        Shelf
      </label>
      <select
        value={m.shelfId}
        disabled={m.savingShelf}
        onChange={(e) => m.handleShelfChange(e.target.value)}
        className="w-full rounded-md border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary outline-none focus:border-accent disabled:opacity-60"
        aria-label="Move to shelf"
      >
        {shelves.map((s) => (
          <option key={s.id} value={s.id}>{s.name}</option>
        ))}
      </select>
      {m.savingShelf && (
        <p className="mt-1 text-xs text-text-tertiary">Moving…</p>
      )}
    </div>
  );
}

function ProgressTracker({
  pageCount,
  mutations: m,
}: {
  pageCount: number | null;
  mutations: M;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-text-tertiary">
        Progress
      </label>
      <div className="mb-2 h-1.5 w-full overflow-hidden rounded-full bg-bg-tertiary">
        <div
          className="progress-fill h-full rounded-full bg-progress"
          style={{ width: `${m.progress?.percentage ?? 0}%` }}
        />
      </div>
      <p className="mb-2 text-xs text-text-tertiary">
        {m.progress
          ? `${m.progress.currentPage}${pageCount ? ` / ${pageCount}` : ""} pages · ${m.progress.percentage}%`
          : "Not started"}
      </p>
      <form onSubmit={m.handleProgressSubmit} className="flex gap-2">
        <input
          type="number"
          min={0}
          max={pageCount ?? undefined}
          value={m.pageInput}
          onChange={(e) => m.setPageInput(e.target.value)}
          placeholder="Current page"
          className="w-full rounded-md border border-border bg-bg-primary px-3 py-1.5 text-sm text-text-primary outline-none focus:border-accent"
        />
        <button
          type="submit"
          disabled={m.savingProgress}
          className="shrink-0 rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-text-on-accent transition-colors hover:bg-accent-hover disabled:opacity-60"
        >
          {m.savingProgress ? "…" : "Update"}
        </button>
      </form>
    </div>
  );
}

function RatingStars({ mutations: m }: { mutations: M }) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
        Rating
      </p>
      <div className="flex gap-1" role="group" aria-label="Rate this book">
        {[1, 2, 3, 4, 5].map((star) => {
          const filled = m.rating !== null && star <= m.rating;
          return (
            <button
              key={`${star}-${m.ratingKey}`}
              onClick={() => m.handleRating(star)}
              disabled={m.savingRating}
              aria-label={`${star} star${star > 1 ? "s" : ""}`}
              aria-pressed={filled}
              style={filled ? { animationDelay: `${(star - 1) * 55}ms` } : undefined}
              className={`text-xl transition-[color,transform] hover:scale-125 disabled:opacity-60 ${
                filled
                  ? "star-pop text-rating"
                  : "text-bg-tertiary hover:text-rating"
              }`}
            >
              ★
            </button>
          );
        })}
      </div>
    </div>
  );
}

function NoteEditor({ mutations: m }: { mutations: M }) {
  return (
    <div>
      <label
        htmlFor="book-note"
        className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-text-tertiary"
      >
        Notes
      </label>
      <textarea
        id="book-note"
        rows={4}
        value={m.note}
        onChange={(e) => m.setNote(e.target.value)}
        placeholder="Your thoughts on this book…"
        className="w-full resize-none rounded-md border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary outline-none placeholder:text-text-tertiary focus:border-accent"
      />
      <button
        onClick={m.handleNoteSave}
        disabled={m.savingNote}
        className="mt-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-text-on-accent transition-colors hover:bg-accent-hover disabled:opacity-60"
      >
        {m.savingNote ? "Saving…" : "Save note"}
      </button>
    </div>
  );
}

function StatusActions({ mutations: m }: { mutations: M }) {
  return (
    <>
      <div className="border-t border-border pt-4">
        <button
          onClick={m.handleToggleFinished}
          className="w-full rounded-md border border-border px-4 py-2 text-sm text-text-secondary transition-colors hover:bg-bg-tertiary"
        >
          {m.dateFinished ? "Mark as unfinished" : "Mark as finished"}
        </button>
        {m.dateFinished && (
          <p className="mt-1.5 text-center text-xs text-text-tertiary">
            Finished{" "}
            {new Date(m.dateFinished).toLocaleDateString(undefined, {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        )}
      </div>

      <button
        onClick={m.handleRemove}
        disabled={m.removing}
        className="w-full rounded-md px-4 py-2 text-sm text-error transition-colors hover:bg-error/10 disabled:opacity-60"
      >
        {m.removing ? "Removing…" : "Remove from library"}
      </button>
    </>
  );
}
