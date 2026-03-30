import { BookCover } from "@/components/library/book-cover";
import { BookDetailPanel } from "@/components/library/book-detail-panel";
import { getBookDetail } from "@/lib/data/books";
import { getUserShelves } from "@/lib/data/shelves";
import { getAuthenticatedUser } from "@/lib/data/user";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ userBookId: string }>;
}): Promise<Metadata> {
  const { userBookId } = await params;
  const user = await getAuthenticatedUser();
  if (!user) return {};
  const book = await getBookDetail(user.id, userBookId);
  return { title: book ? book.book.title : "Book" };
}

export default async function BookDetailPage({
  params,
}: {
  params: Promise<{ userBookId: string }>;
}) {
  const { userBookId } = await params;

  const user = await getAuthenticatedUser();
  if (!user) redirect("/sign-in");

  // Parallel fetch — both are needed before rendering; neither depends on the other
  const [detail, shelves] = await Promise.all([
    getBookDetail(user.id, userBookId),
    getUserShelves(user.id),
  ]);

  if (!detail) notFound();

  const { book } = detail;
  const shelfOptions = shelves.map((s) => ({ id: s.id, name: s.name }));

  return (
    <div className="page-flip-enter mx-auto max-w-[var(--container-library)] px-6 py-8">
      {/* Back link */}
      <Link
        href={`/shelf/${detail.shelfId}`}
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-[var(--color-text-tertiary)] transition-colors hover:text-[var(--color-text-primary)]"
      >
        <ArrowLeft size={14} />
        {detail.shelfName}
      </Link>

      <div className="grid gap-10 lg:grid-cols-[auto_1fr_320px]">
        {/* Cover */}
        <div className="flex justify-center lg:justify-start">
          <BookCover book={book} size="lg" className="shadow-[var(--shadow-book)]" />
        </div>

        {/* Book metadata */}
        <div className="min-w-0">
          <h1 className="font-heading text-2xl font-semibold leading-tight text-[var(--color-text-primary)]">
            {book.title}
          </h1>

          {book.authors.length > 0 && (
            <p className="mt-1 text-base text-[var(--color-text-secondary)]">
              {book.authors.join(", ")}
            </p>
          )}

          {/* Meta row */}
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[var(--color-text-tertiary)]">
            {book.publishYear && <span>{book.publishYear}</span>}
            {book.pageCount && (
              <>
                <span aria-hidden>·</span>
                <span>{book.pageCount} pages</span>
              </>
            )}
            {book.publisher && (
              <>
                <span aria-hidden>·</span>
                <span>{book.publisher}</span>
              </>
            )}
          </div>

          {/* ISBNs */}
          {(book.isbn13 ?? book.isbn10) && (
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--color-text-tertiary)]">
              {book.isbn13 && <span>ISBN-13: {book.isbn13}</span>}
              {book.isbn10 && <span>ISBN-10: {book.isbn10}</span>}
            </div>
          )}

          {/* Description */}
          {book.description && (
            <div className="mt-6">
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]">
                About
              </h2>
              <p className="text-sm leading-relaxed text-[var(--color-text-secondary)]">
                {book.description}
              </p>
            </div>
          )}
        </div>

        {/* Interactive panel — single Client Component boundary */}
        <aside className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-5">
          <BookDetailPanel
            userBookId={userBookId}
            pageCount={book.pageCount}
            initialShelfId={detail.shelfId}
            initialProgress={detail.progress}
            initialRating={detail.rating}
            initialNote={detail.note}
            initialDateFinished={detail.dateFinished}
            shelves={shelfOptions}
          />
        </aside>
      </div>
    </div>
  );
}
