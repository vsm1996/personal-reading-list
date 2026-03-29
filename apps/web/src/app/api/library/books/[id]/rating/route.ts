import { badRequest, getAuthUser, notFound, unauthorized } from "@/lib/api-auth";
import { ValidationError, requireIntInRange } from "@/lib/validate";
import { prisma } from "@bookshelf/db";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

// POST /api/library/books/[id]/rating
// Upserts the star rating (1–5). Pass stars: 0 to remove the rating.
export async function POST(request: Request, { params }: Params) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const { id } = await params;

  const userBook = await prisma.userBook.findFirst({
    where: { id, profileId: user.id },
  });
  if (!userBook) return notFound();

  let stars: number;
  try {
    const body = (await request.json()) as { stars?: unknown };
    // 0 is the "remove rating" sentinel — allow range 0–5
    stars = requireIntInRange(body.stars, "stars", 0, 5);
  } catch (err) {
    if (err instanceof ValidationError) return badRequest(err.message);
    return badRequest("Invalid request body.");
  }

  if (stars === 0) {
    // Remove rating
    await prisma.rating.deleteMany({ where: { userBookId: id } });
    return new NextResponse(null, { status: 204 });
  }

  const rating = await prisma.rating.upsert({
    where: { userBookId: id },
    create: { userBookId: id, stars },
    update: { stars },
  });

  return NextResponse.json({ stars: rating.stars });
}
