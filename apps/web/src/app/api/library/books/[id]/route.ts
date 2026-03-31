import { badRequest, getAuthUser, notFound, unauthorized } from "@/lib/api-auth";
import { ValidationError, requireString } from "@/lib/validate";
import { prisma } from "@bookshelf/db";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

// PATCH /api/library/books/[id]
// Moves the book to a different shelf, or marks it finished/unfinished.
// When moved to the default "Read" shelf, automatically sets dateFinished
// (if not already set) and fills progress to 100%.
export async function PATCH(request: Request, { params }: Params) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const { id } = await params;

  // Ownership check — also load current dateFinished and progress state
  const userBook = await prisma.userBook.findFirst({
    where: { id, profileId: user.id },
    include: {
      book: { select: { pageCount: true } },
      readingProgress: { select: { currentPage: true } },
    },
  });
  if (!userBook) return notFound();

  let updates: { shelfId?: string; dateFinished?: Date | null } = {};
  let targetShelfIsRead = false;

  try {
    const body = (await request.json()) as {
      shelfId?: unknown;
      dateFinished?: unknown;
    };

    if (body.shelfId !== undefined) {
      const shelfId = requireString(body.shelfId, "shelfId");
      // Verify the target shelf belongs to this user
      const shelf = await prisma.shelf.findFirst({
        where: { id: shelfId, profileId: user.id },
        select: { id: true, name: true, isDefault: true },
      });
      if (!shelf) return badRequest("Shelf not found.");
      updates.shelfId = shelfId;
      targetShelfIsRead = shelf.name === "Read" && shelf.isDefault;
    }

    if ("dateFinished" in body) {
      updates.dateFinished =
        body.dateFinished === null
          ? null
          : new Date(requireString(body.dateFinished, "dateFinished"));
    }
  } catch (err) {
    if (err instanceof ValidationError) return badRequest(err.message);
    return badRequest("Invalid request body.");
  }

  if (Object.keys(updates).length === 0) {
    return badRequest("Provide at least one field to update (shelfId, dateFinished).");
  }

  // Auto-set dateFinished and fill progress when moving to the "Read" shelf
  let autoDateFinished: Date | null = null;
  let autoProgress: { currentPage: number; percentage: number } | null = null;

  if (targetShelfIsRead && !("dateFinished" in updates)) {
    autoDateFinished = userBook.dateFinished ?? new Date();
    updates.dateFinished = autoDateFinished;

    // Fill progress to 100% — use existing page count if available
    const pageCount = userBook.book.pageCount;
    const currentPage = pageCount ?? userBook.readingProgress?.currentPage ?? 0;
    autoProgress = { currentPage, percentage: 100 };
  }

  // Run all updates in a transaction — typed as PrismaPromise array
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ops: any[] = [
    prisma.userBook.update({ where: { id }, data: updates }),
  ];

  if (autoProgress) {
    ops.push(
      prisma.readingProgress.upsert({
        where: { userBookId: id },
        create: { userBookId: id, ...autoProgress },
        update: { ...autoProgress },
      })
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [updated] = await prisma.$transaction(ops as any);

  return NextResponse.json({
    ...updated,
    // Extra fields so the client can update optimistic state without a full refresh
    movedToRead: targetShelfIsRead,
    autoProgress,
  });
}
