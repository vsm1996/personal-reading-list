"use client";

import { BookCover } from "@/components/library/book-cover";
import { useLibraryStore } from "@/stores/library.store";
import { useUIStore } from "@/stores/ui.store";
import type { ShelfWithPreview } from "@/types/library";
import { MoreHorizontal, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type Props = {
  shelf: ShelfWithPreview;
  index?: number;
};

export function ShelfSection({ shelf, index = 0 }: Props) {
  const router       = useRouter();
  const openAddBook  = useUIStore((s) => s.openAddBook);
  const moveBook     = useLibraryStore((s) => s.moveBook);
  const addToast     = useUIStore((s) => s.addToast);

  const [isDragOver,      setIsDragOver]      = useState(false);
  const [draggingBookId,  setDraggingBookId]  = useState<string | null>(null);

  // ── Drag-and-drop handlers ──────────────────────────────────────────────────

  function handleDragStart(
    e: React.DragEvent<HTMLAnchorElement>,
    userBookId: string,
  ) {
    e.dataTransfer.setData(
      "application/bookshelf-book",
      JSON.stringify({ userBookId, fromShelfId: shelf.id }),
    );
    e.dataTransfer.effectAllowed = "move";
    // Delay so the element is still visible when the ghost image is captured
    requestAnimationFrame(() => setDraggingBookId(userBookId));
  }

  function handleDragEnd() {
    setDraggingBookId(null);
  }

  function handleDragOver(e: React.DragEvent<HTMLElement>) {
    if (!e.dataTransfer.types.includes("application/bookshelf-book")) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setIsDragOver(true);
  }

  function handleDragLeave(e: React.DragEvent<HTMLElement>) {
    // Only clear when leaving the section entirely, not a child element
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  }

  function handleDrop(e: React.DragEvent<HTMLElement>) {
    e.preventDefault();
    setIsDragOver(false);

    let payload: { userBookId: string; fromShelfId: string };
    try {
      payload = JSON.parse(
        e.dataTransfer.getData("application/bookshelf-book"),
      );
    } catch {
      return;
    }

    const { userBookId, fromShelfId } = payload;
    if (!userBookId || fromShelfId === shelf.id) return; // same shelf → noop

    // Optimistic update
    moveBook(userBookId, fromShelfId, shelf.id);

    // Persist to server — revert on failure, refresh server components on success
    fetch(`/api/library/books/${userBookId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shelfId: shelf.id }),
    }).then(() => {
      router.refresh();
    }).catch(() => {
      moveBook(userBookId, shelf.id, fromShelfId);
      addToast({ type: "error", message: "Couldn't move book. Please try again." });
    });
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <section
      aria-labelledby={`shelf-${shelf.id}`}
      className={`shelf-entrance ${isDragOver ? "shelf-drop-target" : ""}`}
      style={{ animationDelay: `${index * 80}ms` }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Shelf header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/shelf/${shelf.id}`}>
            <h2
              id={`shelf-${shelf.id}`}
              className="font-heading text-lg font-medium text-text-primary transition-colors hover:text-accent"
            >
              {shelf.name}
            </h2>
          </Link>
          <span className="rounded-full bg-bg-tertiary px-2 py-0.5 text-xs text-text-tertiary">
            {shelf.bookCount}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => openAddBook(shelf.id)}
            aria-label={`Add book to ${shelf.name}`}
            className="rounded-md p-1.5 text-text-tertiary transition-colors hover:bg-bg-tertiary hover:text-accent"
          >
            <Plus size={16} />
          </button>
          <ShelfMenu shelf={shelf} />
        </div>
      </div>

      {/* Book row */}
      {shelf.bookCount === 0 ? (
        <EmptyShelf shelfName={shelf.name} onAdd={() => openAddBook(shelf.id)} />
      ) : (
        <>
          <div className="flex items-end gap-3 overflow-x-auto pb-0">
            {shelf.preview.map((book) => (
              <Link
                key={book.userBookId}
                href={`/library/book/${book.userBookId}`}
                draggable
                onDragStart={(e) => handleDragStart(e, book.userBookId)}
                onDragEnd={handleDragEnd}
                className={`book-card group shrink-0 cursor-grab active:cursor-grabbing ${
                  draggingBookId === book.userBookId ? "opacity-30" : ""
                }`}
                title={`Drag to move "${book.title}" to another shelf`}
              >
                <div className="relative">
                  <BookCover book={book} size="md" />
                  {book.percentage !== null && book.percentage > 0 && (
                    <div className="mt-1.5 h-0.5 w-full overflow-hidden rounded-full bg-bg-tertiary">
                      <div
                        className="progress-fill h-full rounded-full bg-progress"
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
                className="flex h-[120px] w-20 shrink-0 flex-col items-center justify-center gap-1 rounded-sm border border-dashed border-border text-text-tertiary transition-colors hover:border-accent hover:text-accent"
              >
                <span className="text-xs font-medium">
                  +{shelf.bookCount - shelf.preview.length}
                </span>
                <span className="text-xs">more</span>
              </Link>
            )}
          </div>

          {/* Bookshelf ledge — warm wood bar under the row of covers */}
          <div className="bookshelf-bar" aria-hidden />
        </>
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
        className="rounded-md p-1.5 text-text-tertiary transition-colors hover:bg-bg-tertiary hover:text-text-primary"
      >
        <MoreHorizontal size={16} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-10 mt-1 min-w-[140px] overflow-hidden rounded-lg border border-border bg-surface py-1 shadow-md"
        >
          <button
            role="menuitem"
            onClick={() => { openRename(shelf.id, shelf.name); setOpen(false); }}
            className="w-full px-3 py-2 text-left text-sm text-text-secondary hover:bg-bg-secondary hover:text-text-primary"
          >
            Rename
          </button>

          {!shelf.isDefault && (
            <button
              role="menuitem"
              onClick={() => { openDelete(shelf.id, shelf.name); setOpen(false); }}
              className="w-full px-3 py-2 text-left text-sm text-error hover:bg-error/10"
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
    <div className="flex h-[120px] items-center justify-center rounded-lg border border-dashed border-border bg-bg-secondary">
      <div className="text-center">
        <p className="text-sm text-text-tertiary">
          No books on {shelfName} yet.
        </p>
        <button
          onClick={onAdd}
          className="mt-1 text-xs text-accent hover:text-accent-hover"
        >
          Search for books to add
        </button>
      </div>
    </div>
  );
}
