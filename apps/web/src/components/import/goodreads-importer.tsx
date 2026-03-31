"use client";

import { parseGoodreadsCSV, type ParsedBook, type GoodreadsShelf } from "@/lib/parsers/goodreads-csv";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useUIStore } from "@/stores/ui.store";
import { Upload } from "lucide-react";
import { useCallback, useRef, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type ImportResult = { imported: number; skipped: number };
type Step = "idle" | "parsing" | "preview" | "importing" | "done" | "error";

const SHELF_LABELS: Record<GoodreadsShelf, string> = {
  "want-to-read":      "Want to Read",
  "currently-reading": "Currently Reading",
  read:                "Read",
};

// ─── Component ────────────────────────────────────────────────────────────────

export function GoodreadsImporter() {
  const addToast = useUIStore((s) => s.addToast);

  const [step,           setStep]           = useState<Step>("idle");
  const [parsedBooks,    setParsedBooks]    = useState<ParsedBook[]>([]);
  const [importProgress, setImportProgress] = useState(0);
  const [result,         setResult]         = useState<ImportResult | null>(null);
  const [errorMessage,   setErrorMessage]   = useState<string | null>(null);
  const [dragOver,       setDragOver]       = useState(false);

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
    e.target.value = ""; // reset so the same file can be re-selected
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
      const message = err instanceof Error ? err.message : "An unexpected error occurred.";
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

  // ── Render ────────────────────────────────────────────────────────────────

  switch (step) {
    case "idle":
      return (
        <IdleStep
          dragOver={dragOver}
          fileInputRef={fileInputRef}
          onDragOver={() => setDragOver(true)}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onFileChange={handleFileChange}
        />
      );

    case "parsing":
      return <ParsingStep />;

    case "preview":
      return (
        <PreviewStep
          parsedBooks={parsedBooks}
          onImport={handleImport}
          onCancel={reset}
        />
      );

    case "importing":
      return <ImportingStep progress={importProgress} total={parsedBooks.length} />;

    case "done":
      return <DoneStep result={result!} onReset={reset} />;

    case "error":
      return <ErrorStep message={errorMessage} onReset={reset} />;
  }
}

// ─── Step components ──────────────────────────────────────────────────────────

function IdleStep({
  dragOver,
  fileInputRef,
  onDragOver,
  onDragLeave,
  onDrop,
  onFileChange,
}: {
  dragOver: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onDragOver: () => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); onDragOver(); }}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={() => fileInputRef.current?.click()}
      className={[
        "flex cursor-pointer flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed px-8 py-16 text-center transition-colors",
        dragOver
          ? "border-accent bg-accent/5"
          : "border-border hover:border-accent hover:bg-bg-secondary",
      ].join(" ")}
    >
      <Upload size={32} className={dragOver ? "text-accent" : "text-text-tertiary"} />
      <div>
        <p className="text-sm font-medium text-text-primary">
          {dragOver ? "Drop your CSV file here" : "Drag & drop your Goodreads CSV"}
        </p>
        <p className="mt-1 text-xs text-text-tertiary">
          or click to browse — accepts .csv files only
        </p>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={onFileChange}
      />
    </div>
  );
}

function ParsingStep() {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <LoadingSpinner />
      <p className="text-sm text-text-secondary">Parsing CSV…</p>
    </div>
  );
}

function PreviewStep({
  parsedBooks,
  onImport,
  onCancel,
}: {
  parsedBooks: ParsedBook[];
  onImport: () => void;
  onCancel: () => void;
}) {
  const importable = parsedBooks.filter((b) => b.isbn13 || b.isbn10);
  const noIsbn = parsedBooks.length - importable.length;

  return (
    <div className="flex flex-col gap-6">
      {/* Summary */}
      <div className="rounded-xl border border-border bg-bg-secondary px-5 py-4">
        <p className="text-sm text-text-primary">
          Found <span className="font-semibold">{parsedBooks.length}</span> book
          {parsedBooks.length !== 1 ? "s" : ""} —{" "}
          <span className="font-semibold text-accent">{importable.length}</span> to import
          {noIsbn > 0 && (
            <span className="text-text-tertiary">{", "}{noIsbn} skipped (no ISBN)</span>
          )}
        </p>
      </div>

      {/* Book table */}
      <div className="overflow-hidden rounded-xl border border-border">
        <div className="max-h-100 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-bg-secondary">
              <tr className="border-b border-border text-left text-xs font-semibold uppercase tracking-wider text-text-tertiary">
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
                      "border-b border-border last:border-0",
                      !hasIsbn ? "opacity-40" : "",
                    ].join(" ")}
                  >
                    <td className="max-w-50 truncate px-4 py-2.5 font-medium text-text-primary">
                      {book.title}
                    </td>
                    <td className="max-w-35 truncate px-4 py-2.5 text-text-secondary">
                      {book.authors[0] ?? "—"}
                    </td>
                    <td className="px-4 py-2.5 text-text-secondary">
                      {SHELF_LABELS[book.shelf]}
                    </td>
                    <td className="px-4 py-2.5 text-text-secondary">
                      {book.rating ? "★".repeat(book.rating) : "—"}
                    </td>
                    <td className="px-4 py-2.5">
                      {hasIsbn ? (
                        <span className="rounded-full bg-success/15 px-2 py-0.5 text-xs font-medium text-success">
                          Ready
                        </span>
                      ) : (
                        <span className="rounded-full bg-bg-tertiary px-2 py-0.5 text-xs font-medium text-text-tertiary">
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
          onClick={onImport}
          disabled={importable.length === 0}
          className="rounded-lg bg-accent px-5 py-2 text-sm font-medium text-text-on-accent transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          Import {importable.length} book{importable.length !== 1 ? "s" : ""}
        </button>
        <button
          onClick={onCancel}
          className="rounded-lg border border-border px-5 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-bg-tertiary"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function ImportingStep({ progress, total }: { progress: number; total: number }) {
  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      <LoadingSpinner />
      <p className="text-sm text-text-secondary">
        Importing…{" "}
        {progress > 0 && (
          <span className="font-medium text-text-primary">({progress}/{total})</span>
        )}
      </p>
    </div>
  );
}

function DoneStep({ result, onReset }: { result: ImportResult; onReset: () => void }) {
  return (
    <div className="flex flex-col items-center gap-6 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-success/15">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-success">
          <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <div>
        <p className="font-heading text-lg font-semibold text-text-primary">Import complete</p>
        <p className="mt-1 text-sm text-text-secondary">
          Imported <span className="font-medium text-text-primary">{result.imported}</span>{" "}
          book{result.imported !== 1 ? "s" : ""}
          {result.skipped > 0 && (
            <>, skipped <span className="font-medium text-text-primary">{result.skipped}</span>{" "}
            duplicate{result.skipped !== 1 ? "s" : ""}</>
          )}
        </p>
      </div>
      <button
        onClick={onReset}
        className="rounded-lg border border-border px-5 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-bg-tertiary"
      >
        Import another file
      </button>
    </div>
  );
}

function ErrorStep({
  message,
  onReset,
}: {
  message: string | null;
  onReset: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-6 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-error/15">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-error">
          <path
            d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          />
        </svg>
      </div>
      <div>
        <p className="font-heading text-lg font-semibold text-text-primary">Something went wrong</p>
        <p className="mt-1 text-sm text-text-secondary">
          {message ?? "An unexpected error occurred."}
        </p>
      </div>
      <button
        onClick={onReset}
        className="rounded-lg border border-border px-5 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-bg-tertiary"
      >
        Try again
      </button>
    </div>
  );
}
