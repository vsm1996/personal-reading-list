"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Progress = { currentPage: number; percentage: number };

type UseBookMutationsProps = {
  userBookId: string;
  initialShelfId: string;
  initialProgress: Progress | null;
  initialRating: number | null;
  initialNote: string | null;
  initialDateFinished: string | null;
};

/**
 * Manages all server mutations for the book detail panel.
 * Keeps API calls, loading states, and optimistic updates out of the UI layer.
 */
export function useBookMutations({
  userBookId,
  initialShelfId,
  initialProgress,
  initialRating,
  initialNote,
  initialDateFinished,
}: UseBookMutationsProps) {
  const router = useRouter();

  // ── Derived state ──────────────────────────────────────────────────────────

  const [shelfId,      setShelfId]      = useState(initialShelfId);
  const [progress,     setProgress]     = useState<Progress | null>(initialProgress);
  const [pageInput,    setPageInput]    = useState(String(initialProgress?.currentPage ?? ""));
  const [rating,       setRating]       = useState<number | null>(initialRating);
  const [note,         setNote]         = useState(initialNote ?? "");
  const [dateFinished, setDateFinished] = useState<string | null>(initialDateFinished);
  const [ratingKey,    setRatingKey]    = useState(0);

  // ── Loading flags ──────────────────────────────────────────────────────────

  const [savingShelf,    setSavingShelf]    = useState(false);
  const [savingProgress, setSavingProgress] = useState(false);
  const [savingRating,   setSavingRating]   = useState(false);
  const [savingNote,     setSavingNote]     = useState(false);
  const [removing,       setRemoving]       = useState(false);
  const [error,          setError]          = useState<string | null>(null);

  // ── Mutations ──────────────────────────────────────────────────────────────

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
      const data = (await res.json()) as {
        movedToRead: boolean;
        autoProgress: { currentPage: number; percentage: number } | null;
        dateFinished?: string | null;
      };
      setShelfId(newShelfId);
      // Optimistically fill progress and dateFinished when moved to Read shelf
      if (data.movedToRead) {
        if (data.autoProgress) setProgress(data.autoProgress);
        if (!dateFinished) setDateFinished(new Date().toISOString());
      }
      router.refresh();
    }
    setSavingShelf(false);
  }

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
      if (data.movedToRead) router.refresh();
    }
    setSavingProgress(false);
  }

  async function handleRating(stars: number) {
    const newStars = stars === rating ? 0 : stars;
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
      if (newStars > 0) setRatingKey((k) => k + 1);
    }
    setSavingRating(false);
  }

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

  async function handleRemove() {
    if (!confirm("Remove this book from your library?")) return;
    setRemoving(true);
    setError(null);

    const res = await fetch(`/api/library/books?userBookId=${userBookId}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      setError("Failed to remove book.");
      setRemoving(false);
    } else {
      router.push("/library");
      router.refresh();
    }
  }

  return {
    // State
    shelfId, progress, pageInput, setPageInput,
    rating, note, setNote, dateFinished, ratingKey,
    // Loading flags
    savingShelf, savingProgress, savingRating, savingNote, removing, error,
    // Handlers
    handleShelfChange, handleProgressSubmit,
    handleRating, handleNoteSave, handleToggleFinished, handleRemove,
  };
}
