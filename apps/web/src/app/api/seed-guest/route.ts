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
 */
export async function POST() {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  // Supabase exposes anonymous status via is_anonymous or app_metadata.provider
  const isAnonymous =
    user.is_anonymous === true ||
    user.app_metadata?.provider === "anonymous";

  if (!isAnonymous) {
    return new NextResponse("Only guest accounts can be seeded.", { status: 403 });
  }

  const existingCount = await prisma.userBook.count({ where: { profileId: user.id } });
  if (existingCount > 0) {
    return NextResponse.json({ seeded: existingCount, skipped: true });
  }

  const shelves = await prisma.shelf.findMany({
    where: { profileId: user.id, isDefault: true },
    select: { id: true, name: true },
  });

  const shelfMap: Record<string, string> = {};
  for (const s of shelves) {
    if (s.name === "Want to Read")    shelfMap["want-to-read"]       = s.id;
    if (s.name === "Currently Reading") shelfMap["currently-reading"] = s.id;
    if (s.name === "Read")            shelfMap["read"]               = s.id;
  }

  const currentYear = new Date().getFullYear();

  // Step 1 — upsert all Book records (shared global cache; safe to run outside transaction)
  for (const b of CURATED_BOOKS) {
    await prisma.book.upsert({
      where: { openLibraryId: b.openLibraryId },
      create: {
        openLibraryId: b.openLibraryId,
        title: b.title,
        authors: b.authors,
        coverUrl: b.coverUrl,
        publishYear: b.publishYear,
        pageCount: b.pageCount,
        isbn13: b.isbn13,
      },
      update: {}, // don't overwrite if already cached by another user
    });
  }

  // Step 2 — fetch the saved book IDs
  const savedBooks = await prisma.book.findMany({
    where: { openLibraryId: { in: CURATED_BOOKS.map((b) => b.openLibraryId) } },
    select: { id: true, openLibraryId: true },
  });
  const bookIdMap = Object.fromEntries(
    savedBooks.map((b) => [b.openLibraryId, b.id])
  );

  // Step 3 — create UserBook entries in batches of 10
  let seeded = 0;
  for (let i = 0; i < CURATED_BOOKS.length; i += 10) {
    const batch = CURATED_BOOKS.slice(i, i + 10);

    await prisma.$transaction(
      batch.flatMap((b) => {
        const shelfId = shelfMap[b.shelf];
        const bookId  = bookIdMap[b.openLibraryId];
        if (!shelfId || !bookId) return [];

        const dateFinished =
          b.shelf === "read" && b.monthFinished
            ? new Date(currentYear, b.monthFinished - 1, 15)
            : null;

        return [
          prisma.userBook.create({
            data: { profileId: user.id, bookId, shelfId, dateFinished },
          }),
        ];
      })
    );

    seeded += batch.length;
  }

  return NextResponse.json({ seeded }, { status: 201 });
}
