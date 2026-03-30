import { getAuthUser, unauthorized } from "@/lib/api-auth";
import { CURATED_BOOKS } from "@/data/curated-books";
import { prisma } from "@bookshelf/db";
import { NextResponse } from "next/server";

/**
 * POST /api/seed-guest
 * Seeds 45 curated books into a brand-new anonymous (guest) account.
 *
 * Guards:
 *  - Must be authenticated (401)
 *  - Must be an anonymous Supabase user (403) — prevents misuse on real accounts
 *  - Must have an empty library (409) — idempotency guard
 *
 * Optimised to 4 round trips regardless of book count:
 *  1. count + findShelves (parallel)
 *  2. book.createMany (skipDuplicates — one INSERT ... ON CONFLICT DO NOTHING)
 *  3. book.findMany   (resolve IDs for new + pre-existing rows)
 *  4. userBook.createMany (skipDuplicates)
 */
export async function POST() {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const isAnonymous =
    user.is_anonymous === true ||
    user.app_metadata?.provider === "anonymous";

  if (!isAnonymous) {
    return new NextResponse("Only guest accounts can be seeded.", { status: 403 });
  }

  // Round trip 1 (parallel): idempotency check + shelf lookup
  const [existingCount, shelves] = await Promise.all([
    prisma.userBook.count({ where: { profileId: user.id } }),
    prisma.shelf.findMany({
      where: { profileId: user.id, isDefault: true },
      select: { id: true, name: true },
    }),
  ]);

  if (existingCount > 0) {
    return NextResponse.json({ seeded: existingCount, skipped: true });
  }

  const shelfMap: Record<string, string> = {};
  for (const s of shelves) {
    if (s.name === "Want to Read")      shelfMap["want-to-read"]       = s.id;
    if (s.name === "Currently Reading") shelfMap["currently-reading"]  = s.id;
    if (s.name === "Read")              shelfMap["read"]               = s.id;
  }

  const currentYear = new Date().getFullYear();

  // Round trip 2: upsert all Book rows in one statement
  await prisma.book.createMany({
    data: CURATED_BOOKS.map((b) => ({
      openLibraryId: b.openLibraryId,
      title:         b.title,
      authors:       b.authors,
      coverUrl:      b.coverUrl,
      publishYear:   b.publishYear,
      pageCount:     b.pageCount,
      isbn13:        b.isbn13,
    })),
    skipDuplicates: true,
  });

  // Round trip 3: resolve IDs (covers pre-existing rows that createMany skipped)
  const savedBooks = await prisma.book.findMany({
    where: { openLibraryId: { in: CURATED_BOOKS.map((b) => b.openLibraryId) } },
    select: { id: true, openLibraryId: true },
  });
  const bookIdMap = Object.fromEntries(
    savedBooks.map((b) => [b.openLibraryId, b.id])
  );

  // Round trip 4: create all UserBook rows in one statement
  const userBookData = CURATED_BOOKS.flatMap((b) => {
    const shelfId = shelfMap[b.shelf];
    const bookId  = bookIdMap[b.openLibraryId];
    if (!shelfId || !bookId) return [];

    const dateFinished =
      b.shelf === "read" && b.monthFinished
        ? new Date(currentYear, b.monthFinished - 1, 15)
        : null;

    return [{ profileId: user.id, bookId, shelfId, dateFinished }];
  });

  await prisma.userBook.createMany({
    data: userBookData,
    skipDuplicates: true,
  });

  return NextResponse.json({ seeded: userBookData.length }, { status: 201 });
}
