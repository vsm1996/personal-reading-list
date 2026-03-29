import { badRequest, getAuthUser, unauthorized } from "@/lib/api-auth";
import { ValidationError, requireString } from "@/lib/validate";
import { prisma } from "@bookshelf/db";
import { NextResponse } from "next/server";

// GET /api/shelves — list all shelves with book counts
export async function GET() {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const shelves = await prisma.shelf.findMany({
    where: { profileId: user.id },
    orderBy: { position: "asc" },
    include: { _count: { select: { userBooks: true } } },
  });

  return NextResponse.json(shelves);
}

// POST /api/shelves — create a custom shelf
export async function POST(request: Request) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  let name: string;
  try {
    const body = (await request.json()) as { name?: unknown };
    name = requireString(body.name, "name", 100);
  } catch (err) {
    if (err instanceof ValidationError) return badRequest(err.message);
    return badRequest("Invalid request body.");
  }

  // Place the new shelf after the last existing one
  const lastShelf = await prisma.shelf.findFirst({
    where: { profileId: user.id },
    orderBy: { position: "desc" },
    select: { position: true },
  });

  const shelf = await prisma.shelf.create({
    data: {
      profileId: user.id,
      name,
      position: (lastShelf?.position ?? -1) + 1,
      isDefault: false,
    },
    include: { _count: { select: { userBooks: true } } },
  });

  return NextResponse.json(shelf, { status: 201 });
}
