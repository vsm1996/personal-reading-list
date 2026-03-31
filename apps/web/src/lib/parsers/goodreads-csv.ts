/**
 * Goodreads CSV parsing utilities.
 *
 * Pure functions — no React, no side effects. Safe to import in Node test
 * environments without any browser or Next.js context.
 *
 * ## Column expectations
 * The parser requires a header row with the following exact column names
 * (Goodreads export format as of 2024):
 *   Title, Author, ISBN, ISBN13, My Rating, Number of Pages,
 *   Date Read, Date Added, Bookshelves
 *
 * All other columns are silently ignored, making the parser tolerant of
 * minor schema variations between Goodreads export versions.
 *
 * ## ISBN format
 * Goodreads wraps ISBN values in `="..."` (e.g. `="9781234567890"`).
 * `stripIsbnWrapper` removes that wrapper before validation. Bare unquoted
 * digits are also accepted.
 *
 * ## Security notes
 * - This module performs NO sanitisation of title or author fields.
 *   Callers must escape/sanitise string values before rendering in HTML.
 * - ISBN fields are validated against strict digit-only patterns; any
 *   non-conforming value returns `null` rather than propagating malformed data.
 * - Date fields must match `YYYY/MM/DD` exactly; anything else returns `null`.
 */

export type GoodreadsShelf = "want-to-read" | "currently-reading" | "read";

export type ParsedBook = {
  title: string;
  authors: string[];
  isbn13: string | null;
  isbn10: string | null;
  pageCount: number | null;
  shelf: GoodreadsShelf;
  rating: number | null;
  dateFinished: string | null;
  dateAdded: string | null;
};

/** Split a single CSV line into fields, handling quoted fields and escaped double-quotes. */
function splitCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      fields.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}

/**
 * Strip the `="..."` wrapper Goodreads uses for ISBN fields.
 * e.g. `="9781234567890"` → `9781234567890`
 * Bare values without the wrapper are returned unchanged.
 */
function stripIsbnWrapper(raw: string): string {
  return raw.replace(/^="?/, "").replace(/"?$/, "").trim();
}

/** Convert "YYYY/MM/DD" → ISO date string, or null. */
function parseGoodreadsDate(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const match = trimmed.match(/^(\d{4})\/(\d{2})\/(\d{2})$/);
  if (!match) return null;
  return new Date(`${match[1]}-${match[2]}-${match[3]}`).toISOString();
}

/**
 * Map the comma-separated `Bookshelves` field from a Goodreads export to one
 * of the three canonical shelf values used in this app.
 *
 * Priority order: `read` > `currently-reading` > `want-to-read` (default).
 * Matching is case-insensitive to guard against inconsistent export formatting.
 */
function mapGoodreadsShelf(bookshelves: string): GoodreadsShelf {
  const shelves = bookshelves.split(",").map((s) => s.trim().toLowerCase());
  if (shelves.includes("read")) return "read";
  if (shelves.includes("currently-reading")) return "currently-reading";
  return "want-to-read";
}

/** Parse a Goodreads CSV export into a list of books. Returns [] on empty/invalid input. */
export function parseGoodreadsCSV(text: string): ParsedBook[] {
  const lines = text.split(/\r?\n/);
  if (lines.length < 2) return [];

  const header = splitCsvLine(lines[0]!);
  const idx = (name: string) => header.findIndex((h) => h.trim() === name);

  const titleIdx    = idx("Title");
  const authorIdx   = idx("Author");
  const isbnIdx     = idx("ISBN");
  const isbn13Idx   = idx("ISBN13");
  const ratingIdx   = idx("My Rating");
  const shelvesIdx  = idx("Bookshelves");
  const dateReadIdx = idx("Date Read");
  const dateAddIdx  = idx("Date Added");
  const pagesIdx    = idx("Number of Pages");

  const books: ParsedBook[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = (lines[i] ?? "").trim();
    if (!line) continue;

    const fields = splitCsvLine(line);
    const get = (col: number) => (col >= 0 ? (fields[col] ?? "").trim() : "");

    const title  = get(titleIdx);
    const author = get(authorIdx);
    if (!title) continue;

    const rawIsbn10 = stripIsbnWrapper(get(isbnIdx));
    const isbn10 = /^\d{10}$/.test(rawIsbn10) ? rawIsbn10 : null;

    const rawIsbn13 = stripIsbnWrapper(get(isbn13Idx));
    const isbn13 = /^\d{13}$/.test(rawIsbn13) ? rawIsbn13 : null;

    const ratingRaw = parseInt(get(ratingIdx), 10);
    const rating = !isNaN(ratingRaw) && ratingRaw > 0 ? ratingRaw : null;

    const pagesRaw = parseInt(get(pagesIdx), 10);
    const pageCount = !isNaN(pagesRaw) && pagesRaw > 0 ? pagesRaw : null;

    books.push({
      title,
      authors: author ? [author] : [],
      isbn13,
      isbn10,
      pageCount,
      shelf: mapGoodreadsShelf(get(shelvesIdx)),
      rating,
      dateFinished: parseGoodreadsDate(get(dateReadIdx)),
      dateAdded:    parseGoodreadsDate(get(dateAddIdx)),
    });
  }

  return books;
}
