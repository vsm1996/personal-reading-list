import type { BookPreview, ShelfWithPreview } from "@/types/library";
import { create } from "zustand";

interface LibraryStore {
  shelves: ShelfWithPreview[];
  hydrated: boolean;

  // Hydrate once with server-fetched data
  hydrate: (shelves: ShelfWithPreview[]) => void;

  // Shelf mutations (optimistic)
  addShelf: (shelf: ShelfWithPreview) => void;
  updateShelf: (id: string, updates: Partial<Pick<ShelfWithPreview, "name" | "position">>) => void;
  removeShelf: (id: string) => void;
  reorderShelves: (orderedIds: string[]) => void;

  // Book mutations (optimistic)
  addBook: (shelfId: string, book: BookPreview) => void;
  removeBook: (userBookId: string, shelfId: string) => void;
  moveBook: (userBookId: string, fromShelfId: string, toShelfId: string) => void;
  updateProgress: (userBookId: string, shelfId: string, currentPage: number, percentage: number) => void;
}

export const useLibraryStore = create<LibraryStore>()((set) => ({
  shelves: [],
  hydrated: false,

  hydrate: (shelves) => set({ shelves, hydrated: true }),

  addShelf: (shelf) =>
    set((s) => ({ shelves: [...s.shelves, shelf] })),

  updateShelf: (id, updates) =>
    set((s) => ({
      shelves: s.shelves.map((shelf) =>
        shelf.id === id ? { ...shelf, ...updates } : shelf
      ),
    })),

  removeShelf: (id) =>
    set((s) => ({ shelves: s.shelves.filter((shelf) => shelf.id !== id) })),

  reorderShelves: (orderedIds) =>
    set((s) => ({
      shelves: orderedIds
        .map((id, position) => {
          const shelf = s.shelves.find((sh) => sh.id === id);
          return shelf ? { ...shelf, position } : null;
        })
        .filter(Boolean) as ShelfWithPreview[],
    })),

  addBook: (shelfId, book) =>
    set((s) => ({
      shelves: s.shelves.map((shelf) =>
        shelf.id === shelfId
          ? {
              ...shelf,
              bookCount: shelf.bookCount + 1,
              preview:
                shelf.preview.length < 8
                  ? [book, ...shelf.preview]
                  : shelf.preview,
            }
          : shelf
      ),
    })),

  removeBook: (userBookId, shelfId) =>
    set((s) => ({
      shelves: s.shelves.map((shelf) =>
        shelf.id === shelfId
          ? {
              ...shelf,
              bookCount: Math.max(0, shelf.bookCount - 1),
              preview: shelf.preview.filter((b) => b.userBookId !== userBookId),
            }
          : shelf
      ),
    })),

  moveBook: (userBookId, fromShelfId, toShelfId) =>
    set((s) => {
      const fromShelf = s.shelves.find((sh) => sh.id === fromShelfId);
      const book = fromShelf?.preview.find((b) => b.userBookId === userBookId);

      return {
        shelves: s.shelves.map((shelf) => {
          if (shelf.id === fromShelfId) {
            return {
              ...shelf,
              bookCount: Math.max(0, shelf.bookCount - 1),
              preview: shelf.preview.filter((b) => b.userBookId !== userBookId),
            };
          }
          if (shelf.id === toShelfId && book) {
            return {
              ...shelf,
              bookCount: shelf.bookCount + 1,
              preview:
                shelf.preview.length < 8
                  ? [book, ...shelf.preview]
                  : shelf.preview,
            };
          }
          return shelf;
        }),
      };
    }),

  updateProgress: (userBookId, shelfId, currentPage, percentage) =>
    set((s) => ({
      shelves: s.shelves.map((shelf) =>
        shelf.id === shelfId
          ? {
              ...shelf,
              preview: shelf.preview.map((b) =>
                b.userBookId === userBookId
                  ? { ...b, currentPage, percentage }
                  : b
              ),
            }
          : shelf
      ),
    })),
}));
