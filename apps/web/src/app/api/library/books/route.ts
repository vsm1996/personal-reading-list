import {
  badRequest,
  conflict,
  getAuthUser,
  notFound,
  unauthorized,
} from "@/lib/api-auth";
import { ValidationError, requireString } from "@/lib/validate";
import type { BookSearchResult } from "@/types/search";
import { prisma } from "@bookshelf/db";
import { NextResponse } from "next/server";

/**
 * Validates and sanitises a client-supplied BookSearchResult.
 *
 * Client data is untrusted — we only persist string fields that are explicitly
 * allow-listed here. Unknown fields are silently dropped.
 */
function validateBookInput(raw: unknown): BookSearchResult {
  if (!raw || typeof raw !== "object") {
    throw new ValidationError("Invalid book data.");
  }
  const b = raw as Record<string, unknown>;

  return {
    openLibraryId: requireString(b.openLibraryId, "openLibraryId", 200),
    title: requireString(b.title, "title", 500),
    // authors must be a string array; coerce defensively
    authors: Array.isArray(b.authors)
      ? b.authors.filter((a): a is string => typeof a === "string").slice(0, 20)
      : [],
    coverUrl:
      typeof b.coverUrl === "string" && b.coverUrl.startsWith("https://")
        ? b.coverUrl
        : null,
    publishYear:
      typeof b.publishYear === "number" && b.publishYear > 1000 && b.publishYear <= new Date().getFullYear() + 1
        ? b.publishYear
        : null,
    pageCount:
      typeof b.pageCount === "number" && b.pageCount > 0 && b.pageCount < 100_000
        ? b.pageCount
        : null,
    isbn13:
      typeof b.isbn13 === "string" && /^\d{13}$/.test(b.isbn13) ? b.isbn13 : null,
    isbn10:
      typeof b.isbn10 === "string" && /^\d{10}$/.test(b.isbn10) ? b.isbn10 : null,
    publisher:
      typeof b.publisher === "string" ? b.publisher.slice(0, 300) : null,
  };
}

// POST /api/library/books
// Upserts the global Book cache entry, then creates a UserBook on the given shelf.
export async function POST(request: Request) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  let book: BookSearchResult;
  let shelfId: string;

  try {
    const body = (await request.json()) as { book?: unknown; shelfId?: unknown };
    shelfId = requireString(body.shelfId, "shelfId");
    book = validateBookInput(body.book);
  } catch (err) {
    if (err instanceof ValidationError) return badRequest(err.message);
    return badRequest("Invalid request body.");
  }

  // Verify the target shelf belongs to this user — prevents cross-user writes
  const shelf = await prisma.shelf.findFirst({
    where: { id: shelfId, profileId: user.id },
  });
  if (!shelf) return notFound("Shelf not found.");

  // Guard against duplicate library entries
  const existing = await prisma.userBook.findFirst({
    where: { profileId: user.id, book: { openLibraryId: book.openLibraryId } },
    include: { shelf: { select: { name: true } } },
  });
  if (existing) {
    return conflict({
      error: "already_in_library",
      message: `"${book.title}" is already on your "${existing.shelf.name}" shelf.`,
      userBookId: existing.id,
    });
  }

  // Upsert the shared Book cache (may already exist from another user adding the same edition)
  const savedBook = await prisma.book.upsert({
    where: { openLibraryId: book.openLibraryId },
    create: {
      openLibraryId: book.openLibraryId,
      title: book.title,
      authors: book.authors,
      coverUrl: book.coverUrl,
      publishYear: book.publishYear,
      pageCount: book.pageCount,
      isbn13: book.isbn13,
      isbn10: book.isbn10,
      publisher: book.publisher,
    },
    update: {
      // Refresh fields that improve over time in Open Library
      coverUrl: book.coverUrl,
      pageCount: book.pageCount,
      publisher: book.publisher,
    },
  });

  const userBook = await prisma.userBook.create({
    data: { profileId: user.id, bookId: savedBook.id, shelfId },
    include: { book: true, shelf: true, readingProgress: true, rating: true },
  });

  return NextResponse.json(userBook, { status: 201 });
}

// DELETE /api/library/books?userBookId=<id>
export async function DELETE(request: Request) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const { searchParams } = new URL(request.url);
  const userBookId = searchParams.get("userBookId");
  if (!userBookId) return badRequest("Missing userBookId query param.");

  // Ownership check — prevents a user deleting another user's book
  const userBook = await prisma.userBook.findFirst({
    where: { id: userBookId, profileId: user.id },
  });
  if (!userBook) return notFound();

  await prisma.userBook.delete({ where: { id: userBookId } });
  return new NextResponse(null, { status: 204 });
}
