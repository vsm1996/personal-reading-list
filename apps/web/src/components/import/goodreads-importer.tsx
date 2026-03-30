"use client";

import { useUIStore } from "@/stores/ui.store";
import { Upload } from "lucide-react";
import { useCallback, useRef, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type AppShelf = "want-to-read" | "currently-reading" | "read";

type ParsedBook = {
  title: string;
  authors: string[];
  isbn13: string | null;
  isbn10: string | null;
  pageCount: number | null;
  shelf: AppShelf;
  rating: number | null;
  dateFinished: string | null;
  dateAdded: string | null;
};

type ImportResult = { imported: number; skipped: number };

type Step = "idle" | "parsing" | "preview" | "importing" | "done" | "error";

// ─── CSV parsing ──────────────────────────────────────────────────────────────

/** Split a single CSV line into fields, handling quoted fields with commas. */
function splitCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote inside a quoted field
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

/** Strip the ="..." wrapping Goodreads uses for ISBN fields. */
function stripIsbnWrapper(raw: string): string {
  return raw.replace(/^="?/, "").replace(/"?$/, "").trim();
}

/** Convert "YYYY/MM/DD" → ISO date string, or null. */
function parseGoodreadsDate(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  // Goodreads format: YYYY/MM/DD
  const match = trimmed.match(/^(\d{4})\/(\d{2})\/(\d{2})$/);
  if (!match) return null;
  return new Date(`${match[1]}-${match[2]}-${match[3]}`).toISOString();
}

function mapGoodreadsShelf(bookshelves: string): AppShelf {
  const shelves = bookshelves
    .split(",")
    .map((s) => s.trim().toLowerCase());
  if (shelves.includes("read")) return "read";
  if (shelves.includes("currently-reading")) return "currently-reading";
  return "want-to-read";
}

function parseGoodreadsCSV(text: string): ParsedBook[] {
  const lines = text.split(/\r?\n/);
  if (lines.length < 2) return [];

  const header = splitCsvLine(lines[0]);
  const idx = (name: string) => header.findIndex((h) => h.trim() === name);

  const titleIdx = idx("Title");
  const authorIdx = idx("Author");
  const isbnIdx = idx("ISBN");
  const isbn13Idx = idx("ISBN13");
  const ratingIdx = idx("My Rating");
  const shelvesIdx = idx("Bookshelves");
  const dateReadIdx = idx("Date Read");
  const dateAddedIdx = idx("Date Added");
  const pagesIdx = idx("Number of Pages");

  const books: ParsedBook[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const fields = splitCsvLine(line);
    const get = (colIdx: number) =>
      colIdx >= 0 ? (fields[colIdx] ?? "").trim() : "";

    const title = get(titleIdx);
    const author = get(authorIdx);
    if (!title) continue;

    const rawIsbn = stripIsbnWrapper(get(isbnIdx));
    const rawIsbn13 = stripIsbnWrapper(get(isbn13Idx));

    const isbn10 = /^\d{10}$/.test(rawIsbn) ? rawIsbn : null;
    const isbn13 = /^\d{13}$/.test(rawIsbn13) ? rawIsbn13 : null;

    const ratingRaw = parseInt(get(ratingIdx), 10);
    const rating = !isNaN(ratingRaw) && ratingRaw > 0 ? ratingRaw : null;

    const pagesRaw = parseInt(get(pagesIdx), 10);
    const pageCount = !isNaN(pagesRaw) && pagesRaw > 0 ? pagesRaw : null;

    const shelf = mapGoodreadsShelf(get(shelvesIdx));
    const dateFinished = parseGoodreadsDate(get(dateReadIdx));
    const dateAdded = parseGoodreadsDate(get(dateAddedIdx));

    books.push({
      title,
      authors: author ? [author] : [],
      isbn13,
      isbn10,
      pageCount,
      shelf,
      rating,
      dateFinished,
      dateAdded,
    });
  }

  return books;
}

// ─── Shelf label helpers ──────────────────────────────────────────────────────

const SHELF_LABELS: Record<AppShelf, string> = {
  "want-to-read": "Want to Read",
  "currently-reading": "Currently Reading",
  read: "Read",
};

// ─── Component ────────────────────────────────────────────────────────────────

export function GoodreadsImporter() {
  const addToast = useUIStore((s) => s.addToast);

  const [step, setStep] = useState<Step>("idle");
  const [parsedBooks, setParsedBooks] = useState<ParsedBook[]>([]);
  const [importProgress, setImportProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback((file: File) => {
    if (!file.name.endsWith(".csv")) {
      setErrorMessage("Please upload a .csv file.");
      setStep("error");
      return;
    }

    setStep("parsing");
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const books = parseGoodreadsCSV(text);
        if (books.length === 0) {
          setErrorMessage("No books found in the CSV file.");
          setStep("error");
          return;
        }
        setParsedBooks(books);
        setStep("preview");
      } catch {
        setErrorMessage("Failed to parse the CSV file.");
        setStep("error");
      }
    };
    reader.onerror = () => {
      setErrorMessage("Failed to read the file.");
      setStep("error");
    };
    reader.readAsText(file);
  }, []);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    // Reset input so the same file can be re-selected
    e.target.value = "";
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  }

  async function handleImport() {
    setStep("importing");
    setImportProgress(0);

    try {
      const res = await fetch("/api/import/goodreads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ books: parsedBooks }),
      });

      setImportProgress(parsedBooks.length);

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Import failed.");
      }

      const data = (await res.json()) as ImportResult;
      setResult(data);
      setStep("done");
      addToast({
        type: "success",
        message: `Imported ${data.imported} book${data.imported !== 1 ? "s" : ""}.`,
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred.";
      setErrorMessage(message);
      setStep("error");
      addToast({ type: "error", message });
    }
  }

  function reset() {
    setStep("idle");
    setParsedBooks([]);
    setImportProgress(0);
    setResult(null);
    setErrorMessage(null);
    setDragOver(false);
  }

  // ── Idle — file upload zone ──────────────────────────────────────────────

  if (step === "idle") {
    return (
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={[
          "flex cursor-pointer flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed px-8 py-16 text-center transition-colors",
          dragOver
            ? "border-[var(--color-accent)] bg-[var(--color-accent)]/5"
            : "border-[var(--color-border)] hover:border-[var(--color-accent)] hover:bg-[var(--color-bg-secondary)]",
        ].join(" ")}
      >
        <Upload
          size={32}
          className={
            dragOver
              ? "text-[var(--color-accent)]"
              : "text-[var(--color-text-tertiary)]"
          }
        />
        <div>
          <p className="text-sm font-medium text-[var(--color-text-primary)]">
            {dragOver ? "Drop your CSV file here" : "Drag & drop your Goodreads CSV"}
          </p>
          <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">
            or click to browse — accepts .csv files only
          </p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
    );
  }

  // ── Parsing ──────────────────────────────────────────────────────────────

  if (step === "parsing") {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--color-border)] border-t-[var(--color-accent)]" />
        <p className="text-sm text-[var(--color-text-secondary)]">Parsing CSV…</p>
      </div>
    );
  }

  // ── Preview ───────────────────────────────────────────────────────────────

  if (step === "preview") {
    const importable = parsedBooks.filter((b) => b.isbn13 || b.isbn10);
    const noIsbn = parsedBooks.length - importable.length;

    return (
      <div className="flex flex-col gap-6">
        {/* Summary */}
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-5 py-4">
          <p className="text-sm text-[var(--color-text-primary)]">
            Found{" "}
            <span className="font-semibold">{parsedBooks.length}</span> book
            {parsedBooks.length !== 1 ? "s" : ""} —{" "}
            <span className="font-semibold text-[var(--color-accent)]">
              {importable.length}
            </span>{" "}
            to import
            {noIsbn > 0 && (
              <span className="text-[var(--color-text-tertiary)]">
                {", "}
                {noIsbn} skipped (no ISBN)
              </span>
            )}
          </p>
        </div>

        {/* Book table */}
        <div className="overflow-hidden rounded-xl border border-[var(--color-border)]">
          <div className="max-h-[400px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-[var(--color-bg-secondary)]">
                <tr className="border-b border-[var(--color-border)] text-left text-xs font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]">
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Author</th>
                  <th className="px-4 py-3">Shelf</th>
                  <th className="px-4 py-3">Rating</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {parsedBooks.map((book, idx) => {
                  const hasIsbn = book.isbn13 ?? book.isbn10;
                  return (
                    <tr
                      key={idx}
                      className={[
                        "border-b border-[var(--color-border)] last:border-0",
                        !hasIsbn ? "opacity-40" : "",
                      ].join(" ")}
                    >
                      <td className="max-w-[200px] truncate px-4 py-2.5 font-medium text-[var(--color-text-primary)]">
                        {book.title}
                      </td>
                      <td className="max-w-[140px] truncate px-4 py-2.5 text-[var(--color-text-secondary)]">
                        {book.authors[0] ?? "—"}
                      </td>
                      <td className="px-4 py-2.5 text-[var(--color-text-secondary)]">
                        {SHELF_LABELS[book.shelf]}
                      </td>
                      <td className="px-4 py-2.5 text-[var(--color-text-secondary)]">
                        {book.rating ? `${"★".repeat(book.rating)}` : "—"}
                      </td>
                      <td className="px-4 py-2.5">
                        {hasIsbn ? (
                          <span className="rounded-full bg-[var(--color-success)]/15 px-2 py-0.5 text-xs font-medium text-[var(--color-success)]">
                            Ready
                          </span>
                        ) : (
                          <span className="rounded-full bg-[var(--color-bg-tertiary)] px-2 py-0.5 text-xs font-medium text-[var(--color-text-tertiary)]">
                            No ISBN
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleImport}
            disabled={importable.length === 0}
            className="rounded-lg bg-[var(--color-accent)] px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-accent-hover)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Import {importable.length} book{importable.length !== 1 ? "s" : ""}
          </button>
          <button
            onClick={reset}
            className="rounded-lg border border-[var(--color-border)] px-5 py-2 text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-tertiary)]"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // ── Importing ─────────────────────────────────────────────────────────────

  if (step === "importing") {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--color-border)] border-t-[var(--color-accent)]" />
        <p className="text-sm text-[var(--color-text-secondary)]">
          Importing…{" "}
          {importProgress > 0 && (
            <span className="font-medium text-[var(--color-text-primary)]">
              ({importProgress}/{parsedBooks.length})
            </span>
          )}
        </p>
      </div>
    );
  }

  // ── Done ──────────────────────────────────────────────────────────────────

  if (step === "done" && result) {
    return (
      <div className="flex flex-col items-center gap-6 py-16 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-success)]/15">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            className="text-[var(--color-success)]"
          >
            <path
              d="M20 6L9 17l-5-5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div>
          <p className="font-heading text-lg font-semibold text-[var(--color-text-primary)]">
            Import complete
          </p>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            Imported{" "}
            <span className="font-medium text-[var(--color-text-primary)]">
              {result.imported}
            </span>{" "}
            book{result.imported !== 1 ? "s" : ""}
            {result.skipped > 0 && (
              <>
                , skipped{" "}
                <span className="font-medium text-[var(--color-text-primary)]">
                  {result.skipped}
                </span>{" "}
                duplicate{result.skipped !== 1 ? "s" : ""}
              </>
            )}
          </p>
        </div>
        <button
          onClick={reset}
          className="rounded-lg border border-[var(--color-border)] px-5 py-2 text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-tertiary)]"
        >
          Import another file
        </button>
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col items-center gap-6 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-error)]/15">
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          className="text-[var(--color-error)]"
        >
          <path
            d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <div>
        <p className="font-heading text-lg font-semibold text-[var(--color-text-primary)]">
          Something went wrong
        </p>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          {errorMessage ?? "An unexpected error occurred."}
        </p>
      </div>
      <button
        onClick={reset}
        className="rounded-lg border border-[var(--color-border)] px-5 py-2 text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-tertiary)]"
      >
        Try again
      </button>
    </div>
  );
}
