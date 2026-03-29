import { createClient } from "@/lib/supabase/server";
import { prisma } from "@bookshelf/db";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

async function getUser() {
  const cookieStore = await cookies();
  const supabase = await createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

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
  const user = await getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const { id } = await params;
  const shelf = await getOwnedShelf(user.id, id);
  if (!shelf) return new NextResponse("Not found", { status: 404 });

  const body = await request.json() as { name?: string; position?: number };

  const updated = await prisma.shelf.update({
    where: { id },
    data: {
      ...(body.name !== undefined && { name: body.name.trim() }),
      ...(body.position !== undefined && { position: body.position }),
    },
  });

  return NextResponse.json(updated);
}

// DELETE /api/shelves/[id] — delete custom shelf, move books to "Want to Read"
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const { id } = await params;
  const shelf = await getOwnedShelf(user.id, id);
  if (!shelf) return new NextResponse("Not found", { status: 404 });
  if (shelf.isDefault) {
    return new NextResponse("Cannot delete default shelves", { status: 400 });
  }

  // Move books to the user's "Want to Read" shelf before deleting
  const wantToRead = await prisma.shelf.findFirst({
    where: { profileId: user.id, name: "Want to Read", isDefault: true },
  });

  await prisma.$transaction([
    ...(wantToRead
      ? [
          prisma.userBook.updateMany({
            where: { shelfId: id },
            data: { shelfId: wantToRead.id },
          }),
        ]
      : []),
    prisma.shelf.delete({ where: { id } }),
  ]);

  return new NextResponse(null, { status: 204 });
}
