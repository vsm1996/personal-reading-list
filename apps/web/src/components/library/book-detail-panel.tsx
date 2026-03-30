"use client";

/**
 * All interactive actions for the book detail page live here so we
 * have a single "use client" boundary — the page itself stays a Server Component.
 *
 * Local state is used for optimistic updates. router.refresh() re-syncs
 * the Server Component after mutations that change shelf/finish status
 * (since those affect the sidebar + shelf detail page).
 */

import { useRouter } from "next/navigation";
import { useState } from "react";

type Shelf = { id: string; name: string };

type Props = {
  userBookId: string;
  pageCount: number | null;
  // Initial server-fetched values
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
  const router = useRouter();

  const [shelfId, setShelfId] = useState(initialShelfId);
  const [progress, setProgress] = useState(initialProgress);
  const [pageInput, setPageInput] = useState(
    String(initialProgress?.currentPage ?? "")
  );
  const [rating, setRating] = useState(initialRating);
  const [note, setNote] = useState(initialNote ?? "");
  const [dateFinished, setDateFinished] = useState(initialDateFinished);

  const [ratingKey, setRatingKey] = useState(0);

  const [savingShelf, setSavingShelf] = useState(false);
  const [savingProgress, setSavingProgress] = useState(false);
  const [savingRating, setSavingRating] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Shelf move ──────────────────────────────────────────────────────────────

  async function handleShelfChange(newShelfId: string) {
    if (newShelfId === shelfId) return;
    setSavingShelf(true);
    setError(null);

    const res = await fetch(`/api/library/books/${userBookId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shelfId: newShelfId }),
    });

    if (!res.ok) {
      setError("Failed to move book.");
    } else {
      setShelfId(newShelfId);
      router.refresh(); // update sidebar shelf counts
    }
    setSavingShelf(false);
  }

  // ── Progress update ─────────────────────────────────────────────────────────

  async function handleProgressSubmit(e: React.FormEvent) {
    e.preventDefault();
    const currentPage = parseInt(pageInput, 10);
    if (!Number.isFinite(currentPage) || currentPage < 0) return;

    setSavingProgress(true);
    setError(null);

    const res = await fetch(`/api/library/books/${userBookId}/progress`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPage }),
    });

    if (!res.ok) {
      setError("Failed to save progress.");
    } else {
      const data = (await res.json()) as {
        currentPage: number;
        percentage: number;
        movedToRead: boolean;
      };
      setProgress(data);
      setPageInput(String(data.currentPage));
      // Book was auto-moved to "Read" shelf — refresh server data
      if (data.movedToRead) router.refresh();
    }
    setSavingProgress(false);
  }

  // ── Rating ──────────────────────────────────────────────────────────────────

  async function handleRating(stars: number) {
    const newStars = stars === rating ? 0 : stars; // clicking same star removes it
    setSavingRating(true);
    setError(null);

    const res = await fetch(`/api/library/books/${userBookId}/rating`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stars: newStars }),
    });

    if (!res.ok) {
      setError("Failed to save rating.");
    } else {
      setRating(newStars === 0 ? null : newStars);
      if (newStars > 0) setRatingKey((k) => k + 1); // retrigger star-pop animation
    }
    setSavingRating(false);
  }

  // ── Note ────────────────────────────────────────────────────────────────────

  async function handleNoteSave() {
    setSavingNote(true);
    setError(null);

    const res = await fetch(`/api/library/books/${userBookId}/note`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: note }),
    });

    if (!res.ok) setError("Failed to save note.");
    setSavingNote(false);
  }

  // ── Mark finished / unfinished ──────────────────────────────────────────────

  async function handleToggleFinished() {
    const newDate = dateFinished ? null : new Date().toISOString();
    setError(null);

    const res = await fetch(`/api/library/books/${userBookId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dateFinished: newDate }),
    });

    if (!res.ok) {
      setError("Failed to update status.");
    } else {
      setDateFinished(newDate);
      router.refresh();
    }
  }

  // ── Remove from library ─────────────────────────────────────────────────────

  async function handleRemove() {
    if (!confirm("Remove this book from your library?")) return;
    setRemoving(true);
    setError(null);

    const res = await fetch(
      `/api/library/books?userBookId=${userBookId}`,
      { method: "DELETE" }
    );

    if (!res.ok) {
      setError("Failed to remove book.");
      setRemoving(false);
    } else {
      router.push("/library");
      router.refresh();
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  const currentShelfName = shelves.find((s) => s.id === shelfId)?.name ?? "";

  return (
    <div className="space-y-6">
      {error && (
        <p className="rounded-md bg-[var(--color-error)]/10 px-3 py-2 text-xs text-[var(--color-error)]">
          {error}
        </p>
      )}

      {/* Shelf selector */}
      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]">
          Shelf
        </label>
        <select
          value={shelfId}
          disabled={savingShelf}
          onChange={(e) => handleShelfChange(e.target.value)}
          className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)] disabled:opacity-60"
          aria-label="Move to shelf"
        >
          {shelves.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        {savingShelf && (
          <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">Moving…</p>
        )}
      </div>

      {/* Progress */}
      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]">
          Progress
        </label>

        {/* Progress bar */}
        <div className="mb-2 h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-bg-tertiary)]">
          <div
            className="progress-fill h-full rounded-full bg-[var(--color-progress)]"
            style={{ width: `${progress?.percentage ?? 0}%` }}
          />
        </div>
        <p className="mb-2 text-xs text-[var(--color-text-tertiary)]">
          {progress
            ? `${progress.currentPage}${pageCount ? ` / ${pageCount}` : ""} pages · ${progress.percentage}%`
            : "Not started"}
        </p>

        <form onSubmit={handleProgressSubmit} className="flex gap-2">
          <input
            type="number"
            min={0}
            max={pageCount ?? undefined}
            value={pageInput}
            onChange={(e) => setPageInput(e.target.value)}
            placeholder="Current page"
            className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 py-1.5 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)]"
          />
          <button
            type="submit"
            disabled={savingProgress}
            className="shrink-0 rounded-md bg-[var(--color-accent)] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[var(--color-accent-hover)] disabled:opacity-60"
          >
            {savingProgress ? "…" : "Update"}
          </button>
        </form>
      </div>

      {/* Rating */}
      <div>
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]">
          Rating
        </p>
        <div className="flex gap-1" role="group" aria-label="Rate this book">
          {[1, 2, 3, 4, 5].map((star) => {
            const filled = rating !== null && star <= rating;
            return (
              <button
                key={`${star}-${ratingKey}`}
                onClick={() => handleRating(star)}
                disabled={savingRating}
                aria-label={`${star} star${star > 1 ? "s" : ""}`}
                aria-pressed={filled}
                style={filled ? { animationDelay: `${(star - 1) * 55}ms` } : undefined}
                className={`text-xl transition-[color,transform] hover:scale-125 disabled:opacity-60 ${
                  filled
                    ? "star-pop text-[var(--color-rating)]"
                    : "text-[var(--color-bg-tertiary)] hover:text-[var(--color-rating)]"
                }`}
              >
                ★
              </button>
            );
          })}
        </div>

      </div>

      {/* Note */}
      <div>
        <label
          htmlFor="book-note"
          className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]"
        >
          Notes
        </label>
        <textarea
          id="book-note"
          rows={4}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Your thoughts on this book…"
          className="w-full resize-none rounded-md border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-tertiary)] focus:border-[var(--color-accent)]"
        />
        <button
          onClick={handleNoteSave}
          disabled={savingNote}
          className="mt-1.5 rounded-md bg-[var(--color-accent)] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[var(--color-accent-hover)] disabled:opacity-60"
        >
          {savingNote ? "Saving…" : "Save note"}
        </button>
      </div>

      {/* Status actions */}
      <div className="border-t border-[var(--color-border)] pt-4">
        <button
          onClick={handleToggleFinished}
          className="w-full rounded-md border border-[var(--color-border)] px-4 py-2 text-sm text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-tertiary)]"
        >
          {dateFinished ? "Mark as unfinished" : "Mark as finished"}
        </button>
        {dateFinished && (
          <p className="mt-1.5 text-center text-xs text-[var(--color-text-tertiary)]">
            Finished{" "}
            {new Date(dateFinished).toLocaleDateString(undefined, {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        )}
      </div>

      {/* Remove */}
      <button
        onClick={handleRemove}
        disabled={removing}
        className="w-full rounded-md px-4 py-2 text-sm text-[var(--color-error)] transition-colors hover:bg-[var(--color-error)]/10 disabled:opacity-60"
      >
        {removing ? "Removing…" : "Remove from library"}
      </button>
    </div>
  );
}
