/**
 * Book detail data layer.
 * Wrapped in React cache() for deduplication within a render pass.
 */

import { prisma } from "@bookshelf/db";
import { cache } from "react";

export type BookDetail = {
  userBookId: string;
  shelfId: string;
  shelfName: string;
  dateAdded: string;
  dateFinished: string | null;
  book: {
    id: string;
    title: string;
    authors: string[];
    coverUrl: string | null;
    pageCount: number | null;
    publishYear: number | null;
    isbn13: string | null;
    isbn10: string | null;
    publisher: string | null;
    description: string | null;
  };
  progress: { currentPage: number; percentage: number } | null;
  rating: number | null;
  note: string | null;
};

/**
 * Returns full detail for one book in the user's library.
 * Returns null if the record doesn't exist or doesn't belong to userId.
 */
export const getBookDetail = cache(
  async (userId: string, userBookId: string): Promise<BookDetail | null> => {
    const ub = await prisma.userBook.findFirst({
      where: { id: userBookId, profileId: userId }, // ownership check
      include: {
        book: true,
        shelf: { select: { id: true, name: true } },
        readingProgress: true,
        rating: true,
        note: true,
      },
    });
    if (!ub) return null;

    return {
      userBookId: ub.id,
      shelfId: ub.shelf.id,
      shelfName: ub.shelf.name,
      dateAdded: ub.dateAdded.toISOString(),
      dateFinished: ub.dateFinished?.toISOString() ?? null,
      book: {
        id: ub.book.id,
        title: ub.book.title,
        authors: ub.book.authors,
        coverUrl: ub.book.coverUrl,
        pageCount: ub.book.pageCount,
        publishYear: ub.book.publishYear,
        isbn13: ub.book.isbn13,
        isbn10: ub.book.isbn10,
        publisher: ub.book.publisher,
        description: ub.book.description,
      },
      progress: ub.readingProgress
        ? {
            currentPage: ub.readingProgress.currentPage,
            percentage: ub.readingProgress.percentage,
          }
        : null,
      rating: ub.rating?.stars ?? null,
      note: ub.note?.content ?? null,
    };
  }
);
