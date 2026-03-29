import {
  badRequest,
  getAuthUser,
  notFound,
  unauthorized,
} from "@/lib/api-auth";
import { ValidationError, requireString } from "@/lib/validate";
import { prisma } from "@bookshelf/db";
import { NextResponse } from "next/server";

/** Fetch a shelf that belongs to the authenticated user — prevents IDOR. */
async function getOwnedShelf(userId: string, shelfId: string) {
  return prisma.shelf.findFirst({
    where: { id: shelfId, profileId: userId },
  });
}

// PATCH /api/shelves/[id] — rename or reposition
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const { id } = await params;
  const shelf = await getOwnedShelf(user.id, id);
  if (!shelf) return notFound();

  let updates: { name?: string; position?: number } = {};
  try {
    const body = (await request.json()) as { name?: unknown; position?: unknown };

    if (body.name !== undefined) {
      updates.name = requireString(body.name, "name", 100);
    }
    if (body.position !== undefined) {
      const pos = Number(body.position);
      if (!Number.isInteger(pos) || pos < 0) {
        return badRequest('"position" must be a non-negative integer.');
      }
      updates.position = pos;
    }
  } catch (err) {
    if (err instanceof ValidationError) return badRequest(err.message);
    return badRequest("Invalid request body.");
  }

  if (Object.keys(updates).length === 0) {
    return badRequest("Provide at least one field to update (name, position).");
  }

  const updated = await prisma.shelf.update({ where: { id }, data: updates });
  return NextResponse.json(updated);
}

// DELETE /api/shelves/[id] — delete a custom shelf; its books move to "Want to Read"
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const { id } = await params;
  const shelf = await getOwnedShelf(user.id, id);
  if (!shelf) return notFound();

  // Default shelves (Want to Read, Currently Reading, Read) cannot be deleted
  if (shelf.isDefault) {
    return badRequest("Default shelves cannot be deleted.");
  }

  // Relocate all books to the user's "Want to Read" shelf before deletion
  // so no UserBook records are orphaned
  const fallback = await prisma.shelf.findFirst({
    where: { profileId: user.id, name: "Want to Read", isDefault: true },
  });

  await prisma.$transaction([
    ...(fallback
      ? [prisma.userBook.updateMany({ where: { shelfId: id }, data: { shelfId: fallback.id } })]
      : []),
    prisma.shelf.delete({ where: { id } }),
  ]);

  return new NextResponse(null, { status: 204 });
}
