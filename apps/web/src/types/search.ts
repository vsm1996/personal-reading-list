// Normalized book result from the search proxy.
// Open Library returns inconsistent shapes — this is the clean version.
export type BookSearchResult = {
  openLibraryId: string;   // e.g. "/works/OL45883W"
  title: string;
  authors: string[];
  coverUrl: string | null;
  publishYear: number | null;
  pageCount: number | null;
  isbn13: string | null;
  isbn10: string | null;
  publisher: string | null;
};
