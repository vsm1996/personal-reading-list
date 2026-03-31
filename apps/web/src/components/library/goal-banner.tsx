import { getGoalProgress } from "@/lib/data/goals";
import { getPaceInfo } from "@/lib/goals-calculations";
import { GoalConfetti } from "@/components/library/goal-confetti";
import Link from "next/link";
import { Target } from "lucide-react";

type Props = { userId: string };

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
        className="mb-8 flex items-center gap-2.5 rounded-lg border border-dashed border-border px-4 py-3 text-sm text-text-tertiary transition-colors hover:border-accent hover:text-accent"
      >
        <Target size={15} />
        Set a reading goal for {year}
      </Link>
    );
  }

  const pct = Math.min(100, Math.round((booksRead / goal.targetCount) * 100));
  const { summary: pace } = getPaceInfo(booksRead, goal.targetCount, year);
  const done = booksRead >= goal.targetCount;

  return (
    <Link
      href="/goals"
      className={`relative mb-8 block overflow-visible rounded-lg border px-4 py-3 transition-colors hover:border-accent ${
        done
          ? "goal-complete border-accent"
          : "border-border bg-bg-secondary"
      }`}
    >
      {done && <GoalConfetti />}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5 min-w-0">
          <Target size={15} className="shrink-0 text-accent" />
          <span className="text-sm font-medium text-text-primary">
            {done
              ? `🎉 Goal complete! ${booksRead} books read in ${year}`
              : `${booksRead} of ${goal.targetCount} books read in ${year}`}
          </span>
        </div>
        <span className="shrink-0 text-xs text-text-tertiary">{pace}</span>
      </div>

      {!done && (
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-bg-tertiary">
          <div
            className="progress-fill h-full rounded-full bg-progress"
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </Link>
  );
}
