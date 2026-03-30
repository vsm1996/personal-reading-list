import { BookCover } from "@/components/library/book-cover";
import { getAuthenticatedUser } from "@/lib/data/user";
import { getShelfDetail, SHELF_PAGE_SIZE } from "@/lib/data/shelves";
import type { SortKey } from "@/lib/data/shelves";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";

export const cacheLife = "default";

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const user = await getAuthenticatedUser();
  if (!user) return {};
  const shelf = await getShelfDetail(user.id, id, "recent", 1);
  return { title: shelf ? shelf.name : "Shelf" };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const VALID_SORTS: SortKey[] = ["recent", "title", "rating"];
const SORT_LABELS: Record<SortKey, string> = {
  recent: "Recently added",
  title: "Title",
  rating: "Rating",
};

function parseSort(raw: string | undefined): SortKey {
  return VALID_SORTS.includes(raw as SortKey) ? (raw as SortKey) : "recent";
}

function parsePage(raw: string | undefined): number {
  const n = parseInt(raw ?? "1", 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type SearchParams = Promise<{ sort?: string; page?: string }>;

export default async function ShelfDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: SearchParams;
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);

  const sort = parseSort(sp.sort);
  const page = parsePage(sp.page);

  const user = await getAuthenticatedUser();
  if (!user) redirect("/sign-in");

  // getShelfDetail handles the ownership check — returns null if not found or not owned
  const shelf = await getShelfDetail(user.id, id, sort, page);
  if (!shelf) notFound();

  // Build a URL helper that merges new params into the current sort/page
  function shelfUrl(overrides: { sort?: SortKey; page?: number }) {
    const s = overrides.sort ?? sort;
    const p = overrides.page ?? 1;
    const qs = new URLSearchParams({ sort: s, page: String(p) });
    return `/shelf/${id}?${qs}`;
  }

  return (
    <div className="page-enter mx-auto max-w-[var(--container-library)] px-6 py-8">
      {/* Back link */}
      <Link
        href="/library"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-[var(--color-text-tertiary)] transition-colors hover:text-[var(--color-text-primary)]"
      >
        <ArrowLeft size={14} />
        Library
      </Link>

      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-[var(--color-text-primary)]">
            {shelf.name}
          </h1>
          <p className="mt-0.5 text-sm text-[var(--color-text-tertiary)]">
            {shelf.bookCount} {shelf.bookCount === 1 ? "book" : "books"}
          </p>
        </div>

        {/* Sort controls — URL-based, no client JS needed */}
        <div className="flex items-center gap-1">
          <span className="text-xs text-[var(--color-text-tertiary)]">Sort:</span>
          {VALID_SORTS.map((s) => (
            <Link
              key={s}
              href={shelfUrl({ sort: s })}
              className={`rounded-md px-3 py-1.5 text-xs transition-colors ${
                sort === s
                  ? "bg-[var(--color-accent)] text-white"
                  : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              {SORT_LABELS[s]}
            </Link>
          ))}
        </div>
      </div>

      {/* Book grid */}
      {shelf.books.length === 0 ? (
        <EmptyShelf />
      ) : (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-6">
          {shelf.books.map((book) => (
            <li key={book.userBookId}>
              <Link
                href={`/library/book/${book.userBookId}`}
                className="group block"
              >
                <div className="relative">
                  <BookCover
                    book={book}
                    size="md"
                    className="w-full transition-transform duration-150 group-hover:-translate-y-1 group-hover:shadow-[var(--shadow-lg)]"
                  />
                  {/* Progress bar */}
                  {book.percentage !== null && book.percentage > 0 && (
                    <div className="mt-1.5 h-0.5 w-full overflow-hidden rounded-full bg-[var(--color-bg-tertiary)]">
                      <div
                        className="h-full rounded-full bg-[var(--color-progress)] transition-all"
                        style={{ width: `${book.percentage}%` }}
                      />
                    </div>
                  )}
                </div>

                <div className="mt-2">
                  <p className="line-clamp-2 text-xs font-medium leading-snug text-[var(--color-text-primary)]">
                    {book.title}
                  </p>
                  {book.authors.length > 0 && (
                    <p className="mt-0.5 truncate text-xs text-[var(--color-text-tertiary)]">
                      {book.authors[0]}
                    </p>
                  )}
                  {book.rating !== null && (
                    <p className="mt-0.5 text-xs text-[var(--color-accent)]">
                      {"★".repeat(book.rating)}
                    </p>
                  )}
                </div>
              </Link>
            </li>
          ))}

          {/* Filler tiles so the last row left-aligns */}
          {Array.from({ length: SHELF_PAGE_SIZE - shelf.books.length }).map(
            (_, i) => (
              <li key={`filler-${i}`} aria-hidden />
            )
          )}
        </ul>
      )}

      {/* Pagination */}
      {shelf.totalPages > 1 && (
        <Pagination
          page={shelf.page}
          totalPages={shelf.totalPages}
          shelfUrl={shelfUrl}
        />
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function EmptyShelf() {
  return (
    <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-[var(--color-border)]">
      <p className="text-sm text-[var(--color-text-tertiary)]">
        No books on this shelf yet.
      </p>
    </div>
  );
}

function Pagination({
  page,
  totalPages,
  shelfUrl,
}: {
  page: number;
  totalPages: number;
  shelfUrl: (overrides: { page?: number }) => string;
}) {
  return (
    <div className="mt-10 flex items-center justify-center gap-2">
      <Link
        href={shelfUrl({ page: page - 1 })}
        aria-label="Previous page"
        aria-disabled={page <= 1}
        className={`flex h-8 w-8 items-center justify-center rounded-md border border-[var(--color-border)] transition-colors ${
          page <= 1
            ? "pointer-events-none opacity-40"
            : "hover:bg-[var(--color-bg-tertiary)]"
        }`}
      >
        <ChevronLeft size={14} />
      </Link>

      <span className="text-sm text-[var(--color-text-secondary)]">
        Page {page} of {totalPages}
      </span>

      <Link
        href={shelfUrl({ page: page + 1 })}
        aria-label="Next page"
        aria-disabled={page >= totalPages}
        className={`flex h-8 w-8 items-center justify-center rounded-md border border-[var(--color-border)] transition-colors ${
          page >= totalPages
            ? "pointer-events-none opacity-40"
            : "hover:bg-[var(--color-bg-tertiary)]"
        }`}
      >
        <ChevronRight size={14} />
      </Link>
    </div>
  );
}
