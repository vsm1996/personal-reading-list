/**
 * GET /api/books/search?q=<query>
 *
 * Proxies search requests to Open Library (openlibrary.org) and normalises
 * the response into the app's `BookSearchResult` shape.
 *
 * Why proxy instead of calling Open Library from the client?
 * - Keeps the Open Library URL and User-Agent out of client bundles.
 * - Allows server-side response caching (`next: { revalidate: 60 }`).
 * - Provides a stable internal contract — if the upstream API changes, only
 *   this file needs updating.
 *
 * Error handling:
 *   - Short queries (< 2 chars) → 200 `{ results: [] }` (no upstream call)
 *   - Upstream non-OK response  → 502 Bad Gateway
 *   - Network / fetch error      → 503 Service Unavailable
 *
 * Security: raw Open Library fields are mapped through `normalizeDoc`, which
 * only extracts the allow-listed fields defined in `BookSearchResult`.
 * Unknown fields from the upstream response are silently dropped.
 */
import type { BookSearchResult } from "@/types/search";
import { NextResponse } from "next/server";

const OL_SEARCH = "https://openlibrary.org/search.json";
const OL_COVER  = "https://covers.openlibrary.org/b/id";

// Fields we actually use — keeps the response payload small
const FIELDS = [
  "key",
  "title",
  "author_name",
  "cover_i",
  "first_publish_year",
  "number_of_pages_median",
  "isbn",
  "publisher",
].join(",");

// Open Library raw doc shape (partial)
type OLDoc = {
  key: string;
  title: string;
  author_name?: string[];
  cover_i?: number;
  first_publish_year?: number;
  number_of_pages_median?: number;
  isbn?: string[];
  publisher?: string[];
};

function normalizeDoc(doc: OLDoc): BookSearchResult {
  const isbns = doc.isbn ?? [];
  const isbn13 = isbns.find((i) => i.length === 13) ?? null;
  const isbn10 = isbns.find((i) => i.length === 10) ?? null;

  return {
    openLibraryId: doc.key,
    title: doc.title,
    authors: doc.author_name ?? [],
    coverUrl: doc.cover_i
      ? `${OL_COVER}/${doc.cover_i}-M.jpg`
      : null,
    publishYear: doc.first_publish_year ?? null,
    pageCount: doc.number_of_pages_median ?? null,
    isbn13,
    isbn10,
    publisher: doc.publisher?.[0] ?? null,
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();

  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const url = new URL(OL_SEARCH);
  url.searchParams.set("q", q);
  url.searchParams.set("limit", "24");
  url.searchParams.set("fields", FIELDS);

  try {
    const res = await fetch(url.toString(), {
      headers: { "User-Agent": "Bookshelf/1.0 (personal reading tracker)" },
      next: { revalidate: 60 }, // cache identical queries for 60s
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "Book search is temporarily unavailable." },
        { status: 502 }
      );
    }

    const data = (await res.json()) as { docs: OLDoc[]; numFound: number };
    const results = (data.docs ?? []).map(normalizeDoc);

    return NextResponse.json({ results, total: data.numFound });
  } catch {
    return NextResponse.json(
      { error: "Could not reach the book search API. Check your connection." },
      { status: 503 }
    );
  }
}
