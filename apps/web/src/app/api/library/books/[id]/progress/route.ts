import { badRequest, getAuthUser, notFound, unauthorized } from "@/lib/api-auth";
import { ValidationError, requireNonNegativeInt } from "@/lib/validate";
import { prisma } from "@bookshelf/db";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

// POST /api/library/books/[id]/progress
// Upserts ReadingProgress and appends a ProgressHistory entry.
// Percentage is calculated server-side from pageCount when available.
export async function POST(request: Request, { params }: Params) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const { id } = await params;

  // Ownership check + load pageCount for percentage calculation
  const userBook = await prisma.userBook.findFirst({
    where: { id, profileId: user.id },
    include: { book: { select: { pageCount: true } } },
  });
  if (!userBook) return notFound();

  let currentPage: number;
  try {
    const body = (await request.json()) as { currentPage?: unknown };
    currentPage = requireNonNegativeInt(body.currentPage, "currentPage");
  } catch (err) {
    if (err instanceof ValidationError) return badRequest(err.message);
    return badRequest("Invalid request body.");
  }

  const pageCount = userBook.book.pageCount;
  const percentage =
    pageCount && pageCount > 0
      ? Math.min(100, Math.round((currentPage / pageCount) * 100))
      : currentPage > 0
        ? 100 // unknown length — treat any page > 0 as in-progress
        : 0;

  const [progress] = await prisma.$transaction([
    // Upsert the current snapshot
    prisma.readingProgress.upsert({
      where: { userBookId: id },
      create: { userBookId: id, currentPage, percentage },
      update: { currentPage, percentage },
    }),
    // Append a history point for pace/stats calculations
    prisma.progressHistory.create({
      data: { userBookId: id, page: currentPage, percentage },
    }),
  ]);

  return NextResponse.json({ currentPage: progress.currentPage, percentage: progress.percentage });
}
