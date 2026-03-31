import { BookCover } from "@/components/library/book-cover";
import { GoalSetter } from "@/components/goals/goal-setter";
import { ProgressRing } from "@/components/goals/progress-ring";
import { getGoalProgress, getFinishedBooksThisYear } from "@/lib/data/goals";
import { getPaceInfo } from "@/lib/goals-calculations";
import { getAuthenticatedUser } from "@/lib/data/user";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Reading Goal" };

export default async function GoalsPage() {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/sign-in");

  const year = new Date().getFullYear();

  const [{ goal, booksRead }, finishedBooks] = await Promise.all([
    getGoalProgress(user.id, year),
    getFinishedBooksThisYear(user.id, year),
  ]);

  const targetCount = goal?.targetCount ?? 0;
  const pct  = targetCount > 0 ? Math.min(100, Math.round((booksRead / targetCount) * 100)) : 0;
  const done = booksRead >= targetCount && targetCount > 0;
  const { diff, booksLeft, booksPerWeekNeeded } = getPaceInfo(booksRead, targetCount, year);

  return (
    <div className="page-enter mx-auto max-w-[var(--container-content)] px-6 py-8">
      <h1 className="mb-8 font-heading text-2xl font-semibold text-text-primary">
        Reading Goal {year}
      </h1>

      {/* Progress + stats */}
      {goal ? (
        <div className="mb-8 rounded-xl border border-border bg-bg-secondary p-6">
          <div className="flex flex-col items-center gap-6 sm:flex-row">
            <ProgressRing pct={pct} booksRead={booksRead} targetCount={targetCount} />

            <div className="flex-1 space-y-4 text-center sm:text-left">
              {done ? (
                <p className="font-heading text-lg font-semibold text-accent">
                  🎉 Goal complete!
                </p>
              ) : (
                <p className="text-sm text-text-secondary">
                  {booksLeft} book{booksLeft !== 1 ? "s" : ""} to go
                </p>
              )}

              {!done && targetCount > 0 && (
                <div className="flex flex-wrap justify-center gap-6 sm:justify-start">
                  <Stat
                    label="Pace"
                    value={diff === 0 ? "On track" : diff > 0 ? `${diff} ahead` : `${Math.abs(diff)} behind`}
                    accent={diff >= 0}
                  />
                  <Stat label="Needed" value={`${booksPerWeekNeeded} / week`} />
                  <Stat label="Completed" value={`${pct}%`} />
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-8 rounded-xl border border-dashed border-border bg-bg-secondary p-8 text-center">
          <p className="text-sm text-text-tertiary">
            You haven&apos;t set a reading goal for {year} yet.
          </p>
        </div>
      )}

      {/* Goal setter */}
      <div className="mb-10 rounded-xl border border-border bg-bg-secondary p-5">
        <h2 className="mb-4 font-heading text-base font-semibold text-text-primary">
          {goal ? "Update goal" : "Set a goal"}
        </h2>
        <GoalSetter year={year} currentTarget={goal?.targetCount ?? null} />
      </div>

      {/* Books finished this year */}
      {finishedBooks.length > 0 && (
        <div>
          <h2 className="mb-4 font-heading text-lg font-semibold text-text-primary">
            Books read in {year}
          </h2>
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(80px,1fr))] gap-4">
            {finishedBooks.map((b) => (
              <li key={b.userBookId}>
                <Link href={`/library/book/${b.userBookId}`} className="group block">
                  <BookCover book={b} size="md" className="w-full group-hover:-translate-y-1" />
                  <p className="mt-1.5 line-clamp-2 text-xs text-text-tertiary">
                    {new Date(b.dateFinished).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <p className="text-xs text-text-tertiary">{label}</p>
      <p className={`text-sm font-semibold ${accent ? "text-accent" : "text-text-primary"}`}>
        {value}
      </p>
    </div>
  );
}
