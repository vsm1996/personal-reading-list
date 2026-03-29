/**
 * Reading goal data layer.
 * Wrapped in React cache() for deduplication within a render pass.
 */

import { prisma } from "@bookshelf/db";
import { cache } from "react";

export type GoalProgress = {
  goal: { id: string; targetCount: number; isCompleted: boolean } | null;
  booksRead: number;
  year: number;
};

export type BookFinishedThisYear = {
  userBookId: string;
  title: string;
  authors: string[];
  coverUrl: string | null;
  dateFinished: string;
};

/**
 * Returns the reading goal for a given year plus books-read count.
 * The count and goal are fetched in parallel.
 */
export const getGoalProgress = cache(
  async (userId: string, year: number): Promise<GoalProgress> => {
    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year + 1, 0, 1);

    const [goal, booksRead] = await Promise.all([
      prisma.readingGoal.findFirst({
        where: { profileId: userId, year },
        select: { id: true, targetCount: true, isCompleted: true },
      }),
      prisma.userBook.count({
        where: {
          profileId: userId,
          dateFinished: { gte: yearStart, lt: yearEnd },
        },
      }),
    ]);

    return { goal, booksRead, year };
  }
);

/**
 * Returns books the user finished in a given year, most-recent first.
 * Kept separate from getGoalProgress so the library banner can stay light.
 */
export const getFinishedBooksThisYear = cache(
  async (userId: string, year: number): Promise<BookFinishedThisYear[]> => {
    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year + 1, 0, 1);

    const userBooks = await prisma.userBook.findMany({
      where: {
        profileId: userId,
        dateFinished: { gte: yearStart, lt: yearEnd },
      },
      orderBy: { dateFinished: "desc" },
      include: { book: { select: { title: true, authors: true, coverUrl: true } } },
    });

    return userBooks.map((ub) => ({
      userBookId: ub.id,
      title: ub.book.title,
      authors: ub.book.authors,
      coverUrl: ub.book.coverUrl,
      dateFinished: ub.dateFinished!.toISOString(),
    }));
  }
);
