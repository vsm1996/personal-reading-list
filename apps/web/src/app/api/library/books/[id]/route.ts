import { badRequest, getAuthUser, notFound, unauthorized } from "@/lib/api-auth";
import { ValidationError, requireString } from "@/lib/validate";
import { prisma } from "@bookshelf/db";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

// PATCH /api/library/books/[id]
// Moves the book to a different shelf, or marks it finished/unfinished.
export async function PATCH(request: Request, { params }: Params) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const { id } = await params;

  // Ownership check
  const userBook = await prisma.userBook.findFirst({
    where: { id, profileId: user.id },
  });
  if (!userBook) return notFound();

  let updates: { shelfId?: string; dateFinished?: Date | null } = {};

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
      });
      if (!shelf) return badRequest("Shelf not found.");
      updates.shelfId = shelfId;
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

  const updated = await prisma.userBook.update({ where: { id }, data: updates });
  return NextResponse.json(updated);
}
