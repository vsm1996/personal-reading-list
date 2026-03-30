import { BookCover } from "@/components/library/book-cover";
import { GoalSetter } from "@/components/goals/goal-setter";
import { getGoalProgress, getFinishedBooksThisYear } from "@/lib/data/goals";
import { getAuthenticatedUser } from "@/lib/data/user";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Reading Goal" };
export const cacheLife = "default";

/** SVG progress ring (server-rendered, no JS). */
function ProgressRing({
  pct,
  booksRead,
  targetCount,
}: {
  pct: number;
  booksRead: number;
  targetCount: number;
}) {
  const r = 54;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;

  return (
    <div className="relative flex h-40 w-40 items-center justify-center">
      <svg
        width="160"
        height="160"
        viewBox="0 0 160 160"
        className="-rotate-90"
        aria-hidden
      >
        {/* Track */}
        <circle cx="80" cy="80" r={r} fill="none" strokeWidth="10"
          className="stroke-[var(--color-bg-tertiary)]" />
        {/* Progress arc */}
        <circle
          cx="80" cy="80" r={r} fill="none" strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
          className="stroke-[var(--color-accent)] transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="font-heading text-3xl font-bold text-[var(--color-text-primary)]">
          {booksRead}
        </span>
        <span className="text-xs text-[var(--color-text-tertiary)]">
          of {targetCount}
        </span>
      </div>
    </div>
  );
}

function getPaceMessage(booksRead: number, targetCount: number, year: number) {
  const now = new Date();
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year + 1, 0, 1);
  const daysInYear = (yearEnd.getTime() - yearStart.getTime()) / 86_400_000;
  const daysElapsed = Math.max(1, (now.getTime() - yearStart.getTime()) / 86_400_000);
  const daysLeft = Math.max(0, daysInYear - daysElapsed);

  const expectedByNow = (daysElapsed / daysInYear) * targetCount;
  const diff = Math.round(booksRead - expectedByNow);
  const booksLeft = Math.max(0, targetCount - booksRead);
  const booksPerWeekNeeded =
    daysLeft > 0 ? ((booksLeft / daysLeft) * 7).toFixed(1) : "0";

  return { diff, booksLeft, booksPerWeekNeeded };
}

export default async function GoalsPage() {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/sign-in");

  const year = new Date().getFullYear();

  const [{ goal, booksRead }, finishedBooks] = await Promise.all([
    getGoalProgress(user.id, year),
    getFinishedBooksThisYear(user.id, year),
  ]);

  const targetCount = goal?.targetCount ?? 0;
  const pct = targetCount > 0 ? Math.min(100, Math.round((booksRead / targetCount) * 100)) : 0;
  const done = booksRead >= targetCount && targetCount > 0;
  const { diff, booksLeft, booksPerWeekNeeded } = getPaceMessage(booksRead, targetCount, year);

  return (
    <div className="page-enter mx-auto max-w-[var(--container-content)] px-6 py-8">
      <h1 className="mb-8 font-heading text-2xl font-semibold text-[var(--color-text-primary)]">
        Reading Goal {year}
      </h1>

      {/* Progress + stats */}
      {goal ? (
        <div className="mb-8 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-6">
          <div className="flex flex-col items-center gap-6 sm:flex-row">
            <ProgressRing pct={pct} booksRead={booksRead} targetCount={targetCount} />

            <div className="flex-1 space-y-4 text-center sm:text-left">
              {done ? (
                <p className="font-heading text-lg font-semibold text-[var(--color-accent)]">
                  🎉 Goal complete!
                </p>
              ) : (
                <p className="text-sm text-[var(--color-text-secondary)]">
                  {booksLeft} book{booksLeft !== 1 ? "s" : ""} to go
                </p>
              )}

              {/* Pace stats */}
              {!done && targetCount > 0 && (
                <div className="flex flex-wrap justify-center gap-6 sm:justify-start">
                  <Stat
                    label="Pace"
                    value={
                      diff === 0
                        ? "On track"
                        : diff > 0
                          ? `${diff} ahead`
                          : `${Math.abs(diff)} behind`
                    }
                    accent={diff >= 0}
                  />
                  <Stat
                    label="Needed"
                    value={`${booksPerWeekNeeded} / week`}
                  />
                  <Stat label="Completed" value={`${pct}%`} />
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-8 rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-8 text-center">
          <p className="text-sm text-[var(--color-text-tertiary)]">
            You haven&apos;t set a reading goal for {year} yet.
          </p>
        </div>
      )}

      {/* Goal setter */}
      <div className="mb-10 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-5">
        <h2 className="mb-4 font-heading text-base font-semibold text-[var(--color-text-primary)]">
          {goal ? "Update goal" : "Set a goal"}
        </h2>
        <GoalSetter year={year} currentTarget={goal?.targetCount ?? null} />
      </div>

      {/* Books finished this year */}
      {finishedBooks.length > 0 && (
        <div>
          <h2 className="mb-4 font-heading text-lg font-semibold text-[var(--color-text-primary)]">
            Books read in {year}
          </h2>
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(80px,1fr))] gap-4">
            {finishedBooks.map((b) => (
              <li key={b.userBookId}>
                <Link href={`/library/book/${b.userBookId}`} className="group block">
                  <BookCover
                    book={b}
                    size="md"
                    className="w-full transition-transform duration-150 group-hover:-translate-y-1"
                  />
                  <p className="mt-1.5 line-clamp-2 text-xs text-[var(--color-text-tertiary)]">
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

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div>
      <p className="text-xs text-[var(--color-text-tertiary)]">{label}</p>
      <p
        className={`text-sm font-semibold ${accent ? "text-[var(--color-accent)]" : "text-[var(--color-text-primary)]"}`}
      >
        {value}
      </p>
    </div>
  );
}
