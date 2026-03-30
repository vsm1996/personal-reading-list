"use client";

import { useLibraryStore } from "@/stores/library.store";
import { useUIStore } from "@/stores/ui.store";
import type { ShelfWithPreview } from "@/types/library";
import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export function CreateShelfModal() {
  const open = useUIStore((s) => s.createShelfModal);
  const close = useUIStore((s) => s.closeCreateShelf);
  const addShelf = useLibraryStore((s) => s.addShelf);

  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset + focus on open
  useEffect(() => {
    if (open) {
      setName("");
      setError(null);
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, close]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    setLoading(true);
    setError(null);

    const res = await fetch("/api/shelves", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmed }),
    });

    if (!res.ok) {
      const text = await res.text();
      setError(text || "Failed to create shelf.");
      setLoading(false);
      return;
    }

    const data = (await res.json()) as {
      id: string;
      name: string;
      position: number;
      isDefault: boolean;
      _count: { userBooks: number };
    };

    // Construct the ShelfWithPreview shape the store expects
    const newShelf: ShelfWithPreview = {
      id: data.id,
      name: data.name,
      position: data.position,
      isDefault: data.isDefault,
      bookCount: data._count.userBooks,
      preview: [],
    };

    addShelf(newShelf);
    close();
  }

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={close}
        aria-hidden
      />

      <div
        role="dialog"
        aria-modal
        aria-labelledby="create-shelf-title"
        className="modal-entrance fixed inset-x-4 top-[30vh] z-50 mx-auto max-w-sm overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-lg)]"
      >
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
          <h2
            id="create-shelf-title"
            className="font-heading text-base font-semibold text-[var(--color-text-primary)]"
          >
            New shelf
          </h2>
          <button
            onClick={close}
            aria-label="Close"
            className="rounded-md p-1 text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)]"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4">
          <label
            htmlFor="new-shelf-name"
            className="mb-1.5 block text-sm text-[var(--color-text-secondary)]"
          >
            Shelf name
          </label>
          <input
            ref={inputRef}
            id="new-shelf-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
            placeholder="e.g. Want to read next"
            className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-tertiary)] focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]"
          />

          {error && (
            <p className="mt-2 text-xs text-[var(--color-error)]">{error}</p>
          )}

          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={close}
              className="rounded-md px-4 py-2 text-sm text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-tertiary)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="rounded-md bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-accent-hover)] disabled:opacity-60"
            >
              {loading ? "Creating…" : "Create shelf"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
