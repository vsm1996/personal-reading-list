// Shared types for library UI — serializable, safe to pass from Server → Client.

export type BookPreview = {
  userBookId: string;
  bookId: string;
  title: string;
  authors: string[];
  coverUrl: string | null;
  pageCount: number | null;
  publishYear: number | null;
  // Reading progress (populated only for "Currently Reading" shelf)
  currentPage: number | null;
  percentage: number | null;
  // Library metadata
  dateAdded: string; // ISO string
  dateFinished: string | null;
  rating: number | null;
};

export type ShelfWithPreview = {
  id: string;
  name: string;
  position: number;
  isDefault: boolean;
  bookCount: number;
  // First 8 books for the shelf row preview
  preview: BookPreview[];
};
