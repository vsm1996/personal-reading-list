import { badRequest, getAuthUser, notFound, unauthorized } from "@/lib/api-auth";
import { prisma } from "@bookshelf/db";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

// POST /api/library/books/[id]/note
// Upserts the note. Sending an empty content string deletes the note.
export async function POST(request: Request, { params }: Params) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const { id } = await params;

  const userBook = await prisma.userBook.findFirst({
    where: { id, profileId: user.id },
  });
  if (!userBook) return notFound();

  let content: string;
  try {
    const body = (await request.json()) as { content?: unknown };
    if (typeof body.content !== "string") return badRequest('"content" must be a string.');
    if (body.content.length > 10_000) return badRequest('"content" must be 10,000 characters or fewer.');
    content = body.content.trim();
  } catch {
    return badRequest("Invalid request body.");
  }

  if (!content) {
    // Empty content = remove note
    await prisma.note.deleteMany({ where: { userBookId: id } });
    return new NextResponse(null, { status: 204 });
  }

  const note = await prisma.note.upsert({
    where: { userBookId: id },
    create: { userBookId: id, content },
    update: { content },
  });

  return NextResponse.json({ content: note.content });
}
