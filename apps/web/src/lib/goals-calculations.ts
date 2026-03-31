/**
 * Pure calculation utilities for reading goal progress.
 *
 * Shared between the Goals page (server component) and the GoalBanner
 * component (client component), so this file must remain framework-agnostic:
 * no React imports, no `"use client"` directive, no server-only APIs.
 *
 * All functions accept an explicit `year` parameter rather than deriving it
 * internally, which makes them deterministic and straightforward to unit-test
 * without mocking `Date` at the module level.
 */

export type PaceInfo = {
  /** Books ahead (positive) or behind (negative) of linear pace */
  diff: number;
  /** Books remaining to hit the target */
  booksLeft: number;
  /** Books per week needed to finish on time */
  booksPerWeekNeeded: string;
  /** Human-readable pace string for compact display (used by GoalBanner) */
  summary: string;
};

/**
 * Given the current read count, annual target, and year, returns pace metrics
 * relative to the linear expected progress for today's date.
 *
 * @param booksRead   - Number of books finished so far
 * @param targetCount - Annual reading goal
 * @param year        - The calendar year the goal is for
 *
 * Pace is modelled as a straight line from 0 books on Jan 1 to `targetCount`
 * books on Dec 31. `diff` is the rounded difference between actual and expected
 * count: positive = ahead, negative = behind, zero = on pace.
 *
 * `booksLeft` is clamped to 0 so it never goes negative when the goal is
 * already exceeded. `booksPerWeekNeeded` is clamped to "0" when no days
 * remain (end of year or goal already met).
 */
export function getPaceInfo(
  booksRead: number,
  targetCount: number,
  year: number,
): PaceInfo {
  const now = new Date();
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year + 1, 0, 1);
  const daysInYear = (yearEnd.getTime() - yearStart.getTime()) / 86_400_000;
  const daysElapsed = Math.max(
    1,
    (now.getTime() - yearStart.getTime()) / 86_400_000,
  );
  const daysLeft = Math.max(0, daysInYear - daysElapsed);

  const expectedByNow = (daysElapsed / daysInYear) * targetCount;
  const diff = Math.round(booksRead - expectedByNow);
  const booksLeft = Math.max(0, targetCount - booksRead);
  const booksPerWeekNeeded =
    daysLeft > 0 ? ((booksLeft / daysLeft) * 7).toFixed(1) : "0";

  let summary: string;
  if (diff > 0) summary = `${diff} book${diff > 1 ? "s" : ""} ahead of pace`;
  else if (diff < 0)
    summary = `${Math.abs(diff)} book${Math.abs(diff) > 1 ? "s" : ""} behind pace`;
  else summary = "right on pace";

  return { diff, booksLeft, booksPerWeekNeeded, summary };
}
