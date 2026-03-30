import { badRequest, getAuthUser, unauthorized } from "@/lib/api-auth";
import { prisma } from "@bookshelf/db";
import { NextResponse } from "next/server";

type ImportBookInput = {
  title: string;
  authors: string[];
  isbn13: string | null;
  isbn10: string | null;
  pageCount: number | null;
  shelf: "want-to-read" | "currently-reading" | "read";
  rating: number | null; // 1–5 or null
  dateFinished: string | null; // ISO string
  dateAdded: string | null; // ISO string
};

type ImportRequest = {
  books: ImportBookInput[];
};

const SHELF_NAME_MAP: Record<string, string> = {
  "want-to-read": "Want to Read",
  "currently-reading": "Currently Reading",
  read: "Read",
};

// POST /api/import/goodreads
export async function POST(request: Request) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  let body: ImportRequest;
  try {
    body = (await request.json()) as ImportRequest;
  } catch {
    return badRequest("Invalid JSON body.");
  }

  const { books } = body;
  if (!Array.isArray(books) || books.length === 0) {
    return badRequest("books must be a non-empty array.");
  }

  // Fetch all of the user's default shelves once
  const userShelves = await prisma.shelf.findMany({
    where: { profileId: user.id, isDefault: true },
  });

  const fallbackShelf = userShelves[0];
  if (!fallbackShelf) {
    return badRequest("No shelves found for this user.");
  }

  // Build a name → shelf map for quick lookup
  const shelfByName = new Map(userShelves.map((s) => [s.name, s]));

  function resolveShelf(shelfKey: string) {
    const name = SHELF_NAME_MAP[shelfKey];
    return name ? (shelfByName.get(name) ?? fallbackShelf) : fallbackShelf;
  }

  let imported = 0;
  let skipped = 0;

  // Process in batches of 20
  const BATCH_SIZE = 20;
  for (let i = 0; i < books.length; i += BATCH_SIZE) {
    const batch = books.slice(i, i + BATCH_SIZE);

    await prisma.$transaction(async (tx) => {
      for (const input of batch) {
        // Skip books with no ISBN identifier
        if (!input.isbn13 && !input.isbn10) {
          skipped++;
          continue;
        }

        const shelf = resolveShelf(input.shelf);

        // Upsert the shared Book record
        let book;
        try {
          if (input.isbn13) {
            book = await tx.book.upsert({
              where: { isbn13: input.isbn13 },
              create: {
                title: input.title,
                authors: input.authors,
                isbn13: input.isbn13,
                isbn10: input.isbn10,
                pageCount: input.pageCount,
              },
              update: {
                // Only refresh non-destructive fields
                pageCount: input.pageCount ?? undefined,
              },
            });
          } else {
            // isbn10 only — try to find by isbn10 first, then create
            const existing = await tx.book.findFirst({
              where: { isbn10: input.isbn10! },
            });
            if (existing) {
              book = existing;
            } else {
              book = await tx.book.create({
                data: {
                  title: input.title,
                  authors: input.authors,
                  isbn10: input.isbn10,
                  pageCount: input.pageCount,
                },
              });
            }
          }
        } catch {
          // Book creation failed — skip this entry
          skipped++;
          continue;
        }

        // Create UserBook, skipping if already exists
        let userBook;
        try {
          userBook = await tx.userBook.create({
            data: {
              profileId: user.id,
              bookId: book.id,
              shelfId: shelf.id,
              dateAdded: input.dateAdded ? new Date(input.dateAdded) : undefined,
              dateFinished: input.dateFinished ? new Date(input.dateFinished) : null,
            },
          });
          imported++;
        } catch (err: unknown) {
          // Unique constraint violation — already in library
          const isUniqueViolation =
            typeof err === "object" &&
            err !== null &&
            "code" in err &&
            (err as { code: string }).code === "P2002";
          if (isUniqueViolation) {
            skipped++;
            continue;
          }
          throw err;
        }

        // Create rating if provided
        if (input.rating && input.rating > 0) {
          await tx.rating.upsert({
            where: { userBookId: userBook.id },
            create: { userBookId: userBook.id, stars: input.rating },
            update: { stars: input.rating },
          });
        }
      }
    });
  }

  return NextResponse.json({ imported, skipped });
}
