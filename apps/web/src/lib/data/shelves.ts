/**
 * Shelf data layer — all Prisma queries for shelf/book data go here.
 *
 * Each exported function is wrapped in React cache() so Server Components
 * that share the same arguments (e.g. sidebar + library page both fetching
 * the same user's shelves) deduplicate to a single DB query per render pass.
 */

import { toShelfWithPreview } from "@/lib/library-mappers";
import type { ShelfWithPreview } from "@/types/library";
import { prisma } from "@bookshelf/db";
import { cache } from "react";

// ─── Shelf list ───────────────────────────────────────────────────────────────

/**
 * All shelves for a user, each with an 8-book cover-strip preview.
 * Shared between the library page and sidebar nav via cache() deduplication.
 */
export const getUserShelves = cache(
  async (userId: string): Promise<ShelfWithPreview[]> => {
    const rawShelves = await prisma.shelf.findMany({
      where: { profileId: userId },
      orderBy: { position: "asc" },
      include: {
        _count: { select: { userBooks: true } },
        userBooks: {
          take: 8,
          orderBy: { dateAdded: "desc" },
          include: { book: true, readingProgress: true, rating: true },
        },
      },
    });
    return rawShelves.map(toShelfWithPreview);
  }
);

// ─── Shelf detail (paginated) ─────────────────────────────────────────────────

export const SHELF_PAGE_SIZE = 24;

export type SortKey = "recent" | "title" | "rating";

/** Resolve URL sort param → Prisma orderBy. Defaults to "recent" for unknown values. */
function getOrderBy(sort: SortKey) {
  switch (sort) {
    case "title":
      return { book: { title: "asc" as const } };
    case "rating":
      // nulls (unrated books) sort to the end in Postgres
      return { rating: { stars: "desc" as const } };
    default:
      return { dateAdded: "desc" as const };
  }
}

export type ShelfDetailBook = {
  userBookId: string;
  bookId: string;
  title: string;
  authors: string[];
  coverUrl: string | null;
  pageCount: number | null;
  publishYear: number | null;
  currentPage: number | null;
  percentage: number | null;
  dateAdded: string; // ISO string
  dateFinished: string | null;
  rating: number | null;
};

export type ShelfDetail = {
  id: string;
  name: string;
  isDefault: boolean;
  bookCount: number;
  books: ShelfDetailBook[];
  page: number;
  totalPages: number;
};

/**
 * Paginated shelf contents with sort support.
 * Returns null if the shelf does not exist or does not belong to userId.
 *
 * The userId check here acts as an ownership gate (IDOR prevention) —
 * even if shelfId is valid, a user can only see their own shelf.
 */
export const getShelfDetail = cache(
  async (
    userId: string,
    shelfId: string,
    sort: SortKey,
    page: number
  ): Promise<ShelfDetail | null> => {
    // Ownership check — verify shelf belongs to user before loading books
    const shelf = await prisma.shelf.findFirst({
      where: { id: shelfId, profileId: userId },
    });
    if (!shelf) return null;

    // Parallel: total count for pagination + paginated book rows
    const [totalCount, userBooks] = await Promise.all([
      prisma.userBook.count({ where: { shelfId, profileId: userId } }),
      prisma.userBook.findMany({
        where: { shelfId, profileId: userId },
        orderBy: getOrderBy(sort),
        skip: (page - 1) * SHELF_PAGE_SIZE,
        take: SHELF_PAGE_SIZE,
        include: { book: true, readingProgress: true, rating: true },
      }),
    ]);

    const books: ShelfDetailBook[] = userBooks.map((ub) => ({
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
    }));

    return {
      id: shelf.id,
      name: shelf.name,
      isDefault: shelf.isDefault,
      bookCount: totalCount,
      books,
      page,
      totalPages: Math.max(1, Math.ceil(totalCount / SHELF_PAGE_SIZE)),
    };
  }
);
