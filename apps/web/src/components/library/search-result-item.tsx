import { BookCover } from "@/components/library/book-cover";
import type { BookSearchResult } from "@/types/search";

type Props = {
  book: BookSearchResult;
  onAdd: (book: BookSearchResult) => void;
  /** True while this specific book is being persisted. */
  adding: boolean;
};

export function SearchResultItem({ book, onAdd, adding }: Props) {
  return (
    <li className="flex items-start gap-3 border-b border-[var(--color-border-subtle)] px-4 py-3 last:border-0 hover:bg-[var(--color-bg-secondary)]">
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
        <div className="mt-1 flex items-center gap-2 text-xs text-[var(--color-text-tertiary)]">
          {book.publishYear && <span>{book.publishYear}</span>}
          {book.publishYear && book.pageCount && <span>·</span>}
          {book.pageCount && <span>{book.pageCount} pages</span>}
        </div>
      </div>

      <button
        onClick={() => onAdd(book)}
        disabled={adding}
        className="shrink-0 rounded-md bg-[var(--color-accent)] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[var(--color-accent-hover)] disabled:opacity-60"
      >
        {adding ? "Adding…" : "Add"}
      </button>
    </li>
  );
}
