/**
 * Reading statistics data layer.
 * Wrapped in React cache() for deduplication within a render pass.
 */

import { prisma } from "@bookshelf/db";
import { cache } from "react";

// ─── Monthly reads ─────────────────────────────────────────────────────────────

/**
 * Books finished per month for a given year.
 * Returns an array of 12 items (month 1–12), count defaults to 0.
 */
export const getMonthlyReads = cache(
  async (
    userId: string,
    year: number
  ): Promise<{ month: number; count: number }[]> => {
    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year + 1, 0, 1);

    const finished = await prisma.userBook.findMany({
      where: {
        profileId: userId,
        dateFinished: { gte: yearStart, lt: yearEnd },
      },
      select: { dateFinished: true },
    });

    // Group by month in JS (month is 0-indexed from Date, so +1)
    const counts: Record<number, number> = {};
    for (const ub of finished) {
      const month = ub.dateFinished!.getMonth() + 1;
      counts[month] = (counts[month] ?? 0) + 1;
    }

    return Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      count: counts[i + 1] ?? 0,
    }));
  }
);

// ─── Rating distribution ───────────────────────────────────────────────────────

/**
 * Count of ratings per star value (1–5).
 */
export const getRatingDistribution = cache(
  async (userId: string): Promise<{ stars: number; count: number }[]> => {
    const ratings = await prisma.rating.findMany({
      where: { userBook: { profileId: userId } },
      select: { stars: true },
    });

    const counts: Record<number, number> = {};
    for (const r of ratings) {
      counts[r.stars] = (counts[r.stars] ?? 0) + 1;
    }

    return [1, 2, 3, 4, 5].map((stars) => ({
      stars,
      count: counts[stars] ?? 0,
    }));
  }
);

// ─── Reading activity heatmap ──────────────────────────────────────────────────

/**
 * Count of progress_history entries per day for the last 365 days.
 * date is ISO string "YYYY-MM-DD".
 */
export const getReadingHeatmap = cache(
  async (userId: string): Promise<{ date: string; count: number }[]> => {
    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - 364);
    start.setHours(0, 0, 0, 0);

    const history = await prisma.progressHistory.findMany({
      where: {
        userBook: { profileId: userId },
        recordedAt: { gte: start },
      },
      select: { recordedAt: true },
    });

    const counts: Record<string, number> = {};
    for (const entry of history) {
      const date = entry.recordedAt.toISOString().slice(0, 10);
      counts[date] = (counts[date] ?? 0) + 1;
    }

    return Object.entries(counts).map(([date, count]) => ({ date, count }));
  }
);

// ─── Top authors ───────────────────────────────────────────────────────────────

/**
 * Top 10 authors by number of finished books.
 */
export const getTopAuthors = cache(
  async (userId: string): Promise<{ author: string; count: number }[]> => {
    const finished = await prisma.userBook.findMany({
      where: {
        profileId: userId,
        dateFinished: { not: null },
      },
      select: { book: { select: { authors: true } } },
    });

    const counts: Record<string, number> = {};
    for (const ub of finished) {
      for (const author of ub.book.authors) {
        counts[author] = (counts[author] ?? 0) + 1;
      }
    }

    return Object.entries(counts)
      .map(([author, count]) => ({ author, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }
);

// ─── Summary stats ─────────────────────────────────────────────────────────────

export type ReadingStats = {
  totalBooks: number;
  booksRead: number;
  totalPages: number;
  avgRating: number | null;
  currentlyReading: number;
};

/**
 * Summary statistics for the user's library.
 */
export const getReadingStats = cache(
  async (userId: string): Promise<ReadingStats> => {
    const userBooks = await prisma.userBook.findMany({
      where: { profileId: userId },
      include: {
        book: { select: { pageCount: true } },
        shelf: { select: { name: true } },
        rating: { select: { stars: true } },
      },
    });

    let totalBooks = 0;
    let booksRead = 0;
    let totalPages = 0;
    let ratingSum = 0;
    let ratingCount = 0;
    let currentlyReading = 0;

    for (const ub of userBooks) {
      totalBooks++;

      if (ub.dateFinished) {
        booksRead++;
        totalPages += ub.book.pageCount ?? 0;
      }

      if (ub.rating) {
        ratingSum += ub.rating.stars;
        ratingCount++;
      }

      if (ub.shelf.name === "Currently Reading") {
        currentlyReading++;
      }
    }

    return {
      totalBooks,
      booksRead,
      totalPages,
      avgRating: ratingCount > 0 ? Math.round((ratingSum / ratingCount) * 10) / 10 : null,
      currentlyReading,
    };
  }
);
