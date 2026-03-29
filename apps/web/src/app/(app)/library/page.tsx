import { LibraryClient } from "@/components/library/library-client";
import { toShelfWithPreview } from "@/lib/library-mappers";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@bookshelf/db";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Library" };
export const cacheLife = "default";

export default async function LibraryPage() {
  const cookieStore = await cookies();
  const supabase = await createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in");

  // Fetch shelves ordered by position, with:
  //   - a total book count per shelf (_count)
  //   - the 8 most recently added books for the cover-strip preview
  const rawShelves = await prisma.shelf.findMany({
    where: { profileId: user.id },
    orderBy: { position: "asc" },
    include: {
      _count: { select: { userBooks: true } },
      userBooks: {
        take: 8,
        orderBy: { dateAdded: "desc" },
        include: {
          book: true,
          readingProgress: true,
          rating: true,
        },
      },
    },
  });

  // Pure transformation — see src/lib/library-mappers.ts
  const shelves = rawShelves.map(toShelfWithPreview);

  return (
    <div className="mx-auto max-w-[var(--container-library)] px-6 py-8">
      <header className="mb-8 flex items-center justify-between">
        <h1 className="font-heading text-2xl font-semibold text-[var(--color-text-primary)]">
          My Library
        </h1>
      </header>

      <LibraryClient initialShelves={shelves} />
    </div>
  );
}
