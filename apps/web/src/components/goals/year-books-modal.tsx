"use client";

import type { BookFinishedThisYear } from "@/lib/data/goals";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";

type Props = {
  year: number;
  onClose: () => void;
};

export function YearBooksModal({ year, onClose }: Props) {
  const [books, setBooks] = useState<BookFinishedThisYear[] | null>(null);
  const [error, setError] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Fetch books for the selected year
  useEffect(() => {
    let cancelled = false;
    setBooks(null);
    setError(false);

    fetch(`/api/goals/year-books?year=${year}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: BookFinishedThisYear[]) => {
        if (!cancelled) setBooks(data);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });

    return () => { cancelled = true; };
  }, [year]);

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  // Close on backdrop click
  function handleOverlayClick(e: React.MouseEvent) {
    if (e.target === overlayRef.current) onClose();
  }

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4"
      onClick={handleOverlayClick}
    >
      <div className="modal-entrance flex max-h-[80vh] w-full max-w-lg flex-col rounded-2xl border border-border bg-surface shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="font-heading text-lg font-semibold text-text-primary">
            Books read in {year}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1 text-text-tertiary transition-colors hover:bg-bg-secondary hover:text-text-primary"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M12 4L4 12M4 4l8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {!books && !error && (
            <div className="flex justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-accent" />
            </div>
          )}

          {error && (
            <p className="text-center text-sm text-error">Failed to load books.</p>
          )}

          {books && books.length === 0 && (
            <p className="text-center text-sm text-text-tertiary">
              No books recorded for {year}.
            </p>
          )}

          {books && books.length > 0 && (
            <>
              <p className="mb-4 text-xs text-text-tertiary">
                {books.length} book{books.length !== 1 ? "s" : ""}
              </p>
              <ul className="space-y-3">
                {books.map((book) => (
                  <li key={book.userBookId}>
                    <Link
                      href={`/library/book/${book.userBookId}`}
                      onClick={onClose}
                      className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-bg-secondary"
                    >
                      {/* Cover thumbnail */}
                      <div className="relative h-14 w-10 shrink-0 overflow-hidden rounded-sm bg-bg-tertiary shadow-sm">
                        {book.coverUrl ? (
                          <Image
                            src={book.coverUrl}
                            alt={book.title}
                            fill
                            className="object-cover"
                            sizes="40px"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <span className="text-[8px] font-bold text-text-tertiary">
                              {book.title.slice(0, 2).toUpperCase()}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-text-primary">
                          {book.title}
                        </p>
                        <p className="truncate text-xs text-text-secondary">
                          {book.authors[0] ?? "Unknown author"}
                        </p>
                        <p className="text-xs text-text-tertiary">
                          {new Date(book.dateFinished).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                          })}
                        </p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
