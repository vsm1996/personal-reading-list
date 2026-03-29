/**
 * Pure functions that transform raw Prisma query results into the UI-facing
 * types defined in src/types/library.ts.
 *
 * Keeping mapping logic here (separate from the page that fetches the data)
 * means these functions can be unit-tested without a database or a rendered
 * component — just call with mock Prisma output and assert on the result.
 */

import type { BookPreview, ShelfWithPreview } from "@/types/library";
import type { Book, Rating, ReadingProgress, Shelf, UserBook } from "@bookshelf/db";

// ─── Input shapes ─────────────────────────────────────────────────────────────
// These mirror the `include` clauses in the Prisma query in library/page.tsx.
// If you change the query, update these types too.

export type RawUserBook = UserBook & {
  book: Book;
  readingProgress: ReadingProgress | null;
  rating: Rating | null;
};

export type RawShelf = Shelf & {
  _count: { userBooks: number };
  userBooks: RawUserBook[];
};

// ─── Mappers ──────────────────────────────────────────────────────────────────

export function toBookPreview(ub: RawUserBook): BookPreview {
  return {
    userBookId: ub.id,
    bookId: ub.bookId,
    title: ub.book.title,
    authors: ub.book.authors,
    coverUrl: ub.book.coverUrl,
    pageCount: ub.book.pageCount,
    publishYear: ub.book.publishYear,
    currentPage: ub.readingProgress?.currentPage ?? null,
    percentage: ub.readingProgress?.percentage ?? null,
    dateAdded: ub.dateAdded.toISOString(),
    dateFinished: ub.dateFinished?.toISOString() ?? null,
    rating: ub.rating?.stars ?? null,
  };
}

export function toShelfWithPreview(shelf: RawShelf): ShelfWithPreview {
  return {
    id: shelf.id,
    name: shelf.name,
    position: shelf.position,
    isDefault: shelf.isDefault,
    bookCount: shelf._count.userBooks,
    preview: shelf.userBooks.map(toBookPreview),
  };
}
