import { LibraryClient } from "@/components/library/library-client";
import { createClient } from "@/lib/supabase/server";
import type { ShelfWithPreview } from "@/types/library";
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

  const shelves: ShelfWithPreview[] = rawShelves.map((shelf) => ({
    id: shelf.id,
    name: shelf.name,
    position: shelf.position,
    isDefault: shelf.isDefault,
    bookCount: shelf._count.userBooks,
    preview: shelf.userBooks.map((ub) => ({
      userBookId: ub.id,
      bookId: ub.bookId,
      title: ub.book.title,
      authors: ub.book.authors,
      coverUrl: ub.book.coverUrl,
      pageCount: ub.book.pageCount,
      publishYear: ub.book.publishYear,
      currentPage: ub.readingProgress?.currentPage ?? null,
      percentage: ub.readingProgress?.percentage ?? null,
      dateAdded: ub.dateAdded.toISOString(),
      dateFinished: ub.dateFinished?.toISOString() ?? null,
      rating: ub.rating?.stars ?? null,
    })),
  }));

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
