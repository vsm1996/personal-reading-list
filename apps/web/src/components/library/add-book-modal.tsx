"use client";

import { BookCover } from "@/components/library/book-cover";
import { useLibraryStore } from "@/stores/library.store";
import { useUIStore } from "@/stores/ui.store";
import type { BookPreview } from "@/types/library";
import type { BookSearchResult } from "@/types/search";
import { Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export function AddBookModal() {
  const { open, shelfId } = useUIStore((s) => s.addBookModal);
  const closeAddBook = useUIStore((s) => s.closeAddBook);
  const shelves = useLibraryStore((s) => s.shelves);
  const addBook = useLibraryStore((s) => s.addBook);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<BookSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selectedShelfId, setSelectedShelfId] = useState<string>("");
  const [adding, setAdding] = useState<string | null>(null); // openLibraryId being added
  const [addError, setAddError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync selected shelf when modal opens
  useEffect(() => {
    if (open) {
      setSelectedShelfId(shelfId ?? shelves[0]?.id ?? "");
      setQuery("");
      setResults([]);
      setSearchError(null);
      setAddError(null);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open, shelfId, shelves]);

  // Debounced search
  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setResults([]);
      setSearchError(null);
      return;
    }

    setLoading(true);
    setSearchError(null);

    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/books/search?q=${encodeURIComponent(query)}`
        );
        const data = (await res.json()) as {
          results?: BookSearchResult[];
          error?: string;
        };

        if (!res.ok || data.error) {
          setSearchError(data.error ?? "Search failed. Please try again.");
          setResults([]);
        } else {
          setResults(data.results ?? []);
          if ((data.results ?? []).length === 0) {
            setSearchError(
              `No books found for "${query}". Try a different title or check the spelling.`
            );
          }
        }
      } catch {
        setSearchError("Could not reach the search API. Check your connection.");
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => {
      clearTimeout(timeout);
      setLoading(false);
    };
  }, [query]);

  async function handleAdd(book: BookSearchResult) {
    if (!selectedShelfId || adding) return;
    setAdding(book.openLibraryId);
    setAddError(null);

    const res = await fetch("/api/library/books", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ book, shelfId: selectedShelfId }),
    });

    if (res.status === 409) {
      const data = (await res.json()) as { message: string };
      setAddError(data.message);
      setAdding(null);
      return;
    }

    if (!res.ok) {
      setAddError("Failed to add book. Please try again.");
      setAdding(null);
      return;
    }

    // Optimistic update — add to the selected shelf's preview
    const bookPreview: BookPreview = {
      userBookId: crypto.randomUUID(), // temp id; page refresh gets the real one
      bookId: book.openLibraryId,
      title: book.title,
      authors: book.authors,
      coverUrl: book.coverUrl,
      pageCount: book.pageCount,
      publishYear: book.publishYear,
      currentPage: null,
      percentage: null,
      dateAdded: new Date().toISOString(),
      dateFinished: null,
      rating: null,
    };

    addBook(selectedShelfId, bookPreview);
    setAdding(null);
    closeAddBook();
  }

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={closeAddBook}
        aria-hidden
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal
        aria-label="Add a book"
        className="fixed inset-x-4 top-[5vh] z-50 mx-auto flex max-h-[90vh] max-w-lg flex-col overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-lg)]"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
          <h2 className="font-heading text-base font-semibold text-[var(--color-text-primary)]">
            Add a book
          </h2>
          <button
            onClick={closeAddBook}
            className="rounded-md p-1 text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)]"
          >
            <X size={18} />
          </button>
        </div>

        {/* Shelf selector */}
        <div className="border-b border-[var(--color-border-subtle)] px-4 py-2.5">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-[var(--color-text-tertiary)]">Add to:</span>
            <select
              value={selectedShelfId}
              onChange={(e) => setSelectedShelfId(e.target.value)}
              className="flex-1 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-2 py-1 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)]"
            >
              {shelves.map((shelf) => (
                <option key={shelf.id} value={shelf.id}>
                  {shelf.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Search input */}
        <div className="border-b border-[var(--color-border-subtle)] px-4 py-2.5">
          <div className="flex items-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 focus-within:border-[var(--color-accent)] focus-within:ring-1 focus-within:ring-[var(--color-accent)]">
            <Search size={15} className="shrink-0 text-[var(--color-text-tertiary)]" />
            <input
              ref={inputRef}
              type="search"
              placeholder="Search by title, author, or ISBN…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-transparent py-2 text-sm text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-tertiary)]"
            />
            {loading && (
              <div className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-[var(--color-border)] border-t-[var(--color-accent)]" />
            )}
          </div>
        </div>

        {/* Add error banner */}
        {addError && (
          <div className="border-b border-[var(--color-border-subtle)] bg-[var(--color-error)]/10 px-4 py-2 text-xs text-[var(--color-error)]">
            {addError}
          </div>
        )}

        {/* Results */}
        <div className="flex-1 overflow-y-auto">
          {searchError && !loading && (
            <p className="px-4 py-8 text-center text-sm text-[var(--color-text-tertiary)]">
              {searchError}
            </p>
          )}

          {!searchError && results.length === 0 && !loading && query.length < 2 && (
            <p className="px-4 py-8 text-center text-sm text-[var(--color-text-tertiary)]">
              Start typing to search millions of books.
            </p>
          )}

          {results.length > 0 && (
            <ul>
              {results.map((book) => (
                <li
                  key={book.openLibraryId}
                  className="flex items-start gap-3 border-b border-[var(--color-border-subtle)] px-4 py-3 last:border-0 hover:bg-[var(--color-bg-secondary)]"
                >
                  <BookCover book={book} size="sm" className="mt-0.5 shrink-0" />

                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm font-medium text-[var(--color-text-primary)]">
                      {book.title}
                    </p>
                    {book.authors.length > 0 && (
                      <p className="mt-0.5 truncate text-xs text-[var(--color-text-secondary)]">
                        {book.authors.join(", ")}
                      </p>
                    )}
                    <div className="mt-1 flex items-center gap-2">
                      {book.publishYear && (
                        <span className="text-xs text-[var(--color-text-tertiary)]">
                          {book.publishYear}
                        </span>
                      )}
                      {book.pageCount && (
                        <span className="text-xs text-[var(--color-text-tertiary)]">
                          · {book.pageCount} pages
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => handleAdd(book)}
                    disabled={adding === book.openLibraryId}
                    className="shrink-0 rounded-md bg-[var(--color-accent)] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[var(--color-accent-hover)] disabled:opacity-60"
                  >
                    {adding === book.openLibraryId ? "Adding…" : "Add"}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
