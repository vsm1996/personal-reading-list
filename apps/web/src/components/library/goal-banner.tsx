import { getGoalProgress } from "@/lib/data/goals";
import Link from "next/link";
import { Target } from "lucide-react";

type Props = { userId: string };

/** Calculates how many books ahead/behind the linear pace for the year. */
function getPaceMessage(booksRead: number, targetCount: number, year: number): string {
  const now = new Date();
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year + 1, 0, 1);
  const daysInYear = (yearEnd.getTime() - yearStart.getTime()) / 86_400_000;
  const daysElapsed = Math.max(1, (now.getTime() - yearStart.getTime()) / 86_400_000);

  const expectedByNow = (daysElapsed / daysInYear) * targetCount;
  const diff = Math.round(booksRead - expectedByNow);

  if (diff > 0) return `${diff} book${diff > 1 ? "s" : ""} ahead of pace`;
  if (diff < 0) return `${Math.abs(diff)} book${Math.abs(diff) > 1 ? "s" : ""} behind pace`;
  return "right on pace";
}

/**
 * Compact reading goal banner shown above the shelf list on the library page.
 * Server Component — shares the getGoalProgress() cache with the goals page.
 */
export async function GoalBanner({ userId }: Props) {
  const year = new Date().getFullYear();
  const { goal, booksRead } = await getGoalProgress(userId, year);

  // No banner if the user hasn't set a goal yet
  if (!goal) {
    return (
      <Link
        href="/goals"
        className="mb-8 flex items-center gap-2.5 rounded-lg border border-dashed border-[var(--color-border)] px-4 py-3 text-sm text-[var(--color-text-tertiary)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
      >
        <Target size={15} />
        Set a reading goal for {year}
      </Link>
    );
  }

  const pct = Math.min(100, Math.round((booksRead / goal.targetCount) * 100));
  const pace = getPaceMessage(booksRead, goal.targetCount, year);
  const done = booksRead >= goal.targetCount;

  return (
    <Link
      href="/goals"
      className="mb-8 block rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-4 py-3 transition-colors hover:border-[var(--color-accent)]"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5 min-w-0">
          <Target size={15} className="shrink-0 text-[var(--color-accent)]" />
          <span className="text-sm font-medium text-[var(--color-text-primary)]">
            {done
              ? `🎉 Goal complete! ${booksRead} books read in ${year}`
              : `${booksRead} of ${goal.targetCount} books read in ${year}`}
          </span>
        </div>
        <span className="shrink-0 text-xs text-[var(--color-text-tertiary)]">{pace}</span>
      </div>

      {!done && (
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-bg-tertiary)]">
          <div
            className="h-full rounded-full bg-[var(--color-accent)] transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </Link>
  );
}
