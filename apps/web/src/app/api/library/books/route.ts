import { createClient } from "@/lib/supabase/server";
import type { BookSearchResult } from "@/types/search";
import { prisma } from "@bookshelf/db";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

async function getUser() {
  const cookieStore = await cookies();
  const supabase = await createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// POST /api/library/books
// Body: { book: BookSearchResult, shelfId: string }
// Upserts the global Book, then creates a UserBook on the requested shelf.
export async function POST(request: Request) {
  const user = await getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const body = await request.json() as { book: BookSearchResult; shelfId: string };
  const { book, shelfId } = body;

  if (!book?.openLibraryId || !shelfId) {
    return new NextResponse("Missing book or shelfId", { status: 400 });
  }

  // Verify the shelf belongs to this user
  const shelf = await prisma.shelf.findFirst({
    where: { id: shelfId, profileId: user.id },
  });
  if (!shelf) return new NextResponse("Shelf not found", { status: 404 });

  // Check for existing UserBook (prevent duplicates)
  const existingUserBook = await prisma.userBook.findFirst({
    where: {
      profileId: user.id,
      book: { openLibraryId: book.openLibraryId },
    },
    include: { book: true, shelf: true },
  });

  if (existingUserBook) {
    return NextResponse.json(
      {
        error: "already_in_library",
        message: `"${book.title}" is already on your "${existingUserBook.shelf.name}" shelf.`,
        userBookId: existingUserBook.id,
      },
      { status: 409 }
    );
  }

  // Upsert the global book cache entry
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
      // Refresh metadata in case Open Library data improved
      coverUrl: book.coverUrl,
      pageCount: book.pageCount,
      publisher: book.publisher,
    },
  });

  // Create the user's library entry
  const userBook = await prisma.userBook.create({
    data: {
      profileId: user.id,
      bookId: savedBook.id,
      shelfId,
    },
    include: {
      book: true,
      shelf: true,
      readingProgress: true,
      rating: true,
    },
  });

  return NextResponse.json(userBook, { status: 201 });
}

// DELETE /api/library/books?userBookId=<id>
export async function DELETE(request: Request) {
  const user = await getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const { searchParams } = new URL(request.url);
  const userBookId = searchParams.get("userBookId");
  if (!userBookId) return new NextResponse("Missing userBookId", { status: 400 });

  const userBook = await prisma.userBook.findFirst({
    where: { id: userBookId, profileId: user.id },
  });
  if (!userBook) return new NextResponse("Not found", { status: 404 });

  await prisma.userBook.delete({ where: { id: userBookId } });

  return new NextResponse(null, { status: 204 });
}
