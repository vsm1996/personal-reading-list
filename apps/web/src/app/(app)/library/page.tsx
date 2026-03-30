import { LibraryClient } from "@/components/library/library-client";
import { GoalBanner } from "@/components/library/goal-banner";
import { getAuthenticatedUser } from "@/lib/data/user";
import { getUserShelves } from "@/lib/data/shelves";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

export const metadata: Metadata = { title: "Library" };

function GoalBannerSkeleton() {
  return (
    <div className="mb-8 h-[52px] animate-pulse rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)]" />
  );
}

export default async function LibraryPage() {
  // Both calls are React cache()-wrapped — they deduplicate with the layout's
  // calls so no extra DB round-trips fire for this render pass.
  const user = await getAuthenticatedUser();
  if (!user) redirect("/sign-in");

  const shelves = await getUserShelves(user.id);

  return (
    <div className="page-enter mx-auto max-w-[var(--container-library)] px-6 py-8">
      <header className="mb-8 flex items-center justify-between">
        <h1 className="font-heading text-2xl font-semibold text-[var(--color-text-primary)]">
          My Library
        </h1>
      </header>

      <Suspense fallback={<GoalBannerSkeleton />}>
        <GoalBanner userId={user.id} />
      </Suspense>
      <LibraryClient initialShelves={shelves} />
    </div>
  );
}
