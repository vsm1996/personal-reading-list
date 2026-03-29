"use client";

import { BookCover } from "@/components/library/book-cover";
import { useUIStore } from "@/stores/ui.store";
import type { ShelfWithPreview } from "@/types/library";
import { MoreHorizontal, Plus } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type Props = {
  shelf: ShelfWithPreview;
};

export function ShelfSection({ shelf }: Props) {
  const openAddBook = useUIStore((s) => s.openAddBook);

  return (
    <section aria-labelledby={`shelf-${shelf.id}`}>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/shelf/${shelf.id}`}>
            <h2
              id={`shelf-${shelf.id}`}
              className="font-heading text-lg font-medium text-[var(--color-text-primary)] transition-colors hover:text-[var(--color-accent)]"
            >
              {shelf.name}
            </h2>
          </Link>
          <span className="rounded-full bg-[var(--color-bg-tertiary)] px-2 py-0.5 text-xs text-[var(--color-text-tertiary)]">
            {shelf.bookCount}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => openAddBook(shelf.id)}
            aria-label={`Add book to ${shelf.name}`}
            className="rounded-md p-1.5 text-[var(--color-text-tertiary)] transition-colors hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-accent)]"
          >
            <Plus size={16} />
          </button>
          <ShelfMenu shelf={shelf} />
        </div>
      </div>

      {shelf.bookCount === 0 ? (
        <EmptyShelf shelfName={shelf.name} onAdd={() => openAddBook(shelf.id)} />
      ) : (
        <div className="flex items-end gap-3 overflow-x-auto pb-2">
          {shelf.preview.map((book) => (
            <Link
              key={book.userBookId}
              href={`/library/book/${book.userBookId}`}
              className="group shrink-0"
            >
              <div className="relative">
                <BookCover
                  book={book}
                  size="md"
                  className="transition-transform duration-150 group-hover:-translate-y-1 group-hover:shadow-[var(--shadow-lg)]"
                />
                {book.percentage !== null && book.percentage > 0 && (
                  <div className="mt-1.5 h-0.5 w-full overflow-hidden rounded-full bg-[var(--color-bg-tertiary)]">
                    <div
                      className="h-full rounded-full bg-[var(--color-progress)] transition-all"
                      style={{ width: `${book.percentage}%` }}
                    />
                  </div>
                )}
              </div>
            </Link>
          ))}

          {shelf.bookCount > shelf.preview.length && (
            <Link
              href={`/shelf/${shelf.id}`}
              className="flex h-[120px] w-20 shrink-0 flex-col items-center justify-center gap-1 rounded-sm border border-dashed border-[var(--color-border)] text-[var(--color-text-tertiary)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
            >
              <span className="text-xs font-medium">
                +{shelf.bookCount - shelf.preview.length}
              </span>
              <span className="text-xs">more</span>
            </Link>
          )}
        </div>
      )}
    </section>
  );
}

// ─── Shelf menu dropdown ──────────────────────────────────────────────────────

function ShelfMenu({ shelf }: { shelf: ShelfWithPreview }) {
  const [open, setOpen] = useState(false);
  const openRename = useUIStore((s) => s.openRenameShelf);
  const openDelete = useUIStore((s) => s.openDeleteShelf);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    if (!open) return;

    function handlePointerDown(e: PointerEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  return (
    <div ref={menuRef} className="relative">
      <button
        aria-label={`Shelf options for ${shelf.name}`}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
        className="rounded-md p-1.5 text-[var(--color-text-tertiary)] transition-colors hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)]"
      >
        <MoreHorizontal size={16} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-10 mt-1 min-w-[140px] overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] py-1 shadow-[var(--shadow-md)]"
        >
          <button
            role="menuitem"
            onClick={() => { openRename(shelf.id, shelf.name); setOpen(false); }}
            className="w-full px-3 py-2 text-left text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text-primary)]"
          >
            Rename
          </button>

          {/* Default shelves (Want to Read, Currently Reading, Read) cannot be deleted */}
          {!shelf.isDefault && (
            <button
              role="menuitem"
              onClick={() => { openDelete(shelf.id, shelf.name); setOpen(false); }}
              className="w-full px-3 py-2 text-left text-sm text-[var(--color-error)] hover:bg-[var(--color-error)]/10"
            >
              Delete shelf
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyShelf({ shelfName, onAdd }: { shelfName: string; onAdd: () => void }) {
  return (
    <div className="flex h-[120px] items-center justify-center rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
      <div className="text-center">
        <p className="text-sm text-[var(--color-text-tertiary)]">
          No books on {shelfName} yet.
        </p>
        <button
          onClick={onAdd}
          className="mt-1 text-xs text-[var(--color-accent)] hover:text-[var(--color-accent-hover)]"
        >
          Search for books to add
        </button>
      </div>
    </div>
  );
}
