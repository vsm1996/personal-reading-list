"use client";

import { useLibraryStore } from "@/stores/library.store";
import { useUIStore } from "@/stores/ui.store";
import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export function RenameShelfModal() {
  const { open, shelfId, currentName } = useUIStore((s) => s.renameShelfModal);
  const close = useUIStore((s) => s.closeRenameShelf);
  const updateShelf = useLibraryStore((s) => s.updateShelf);

  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync input to currentName on open
  useEffect(() => {
    if (open) {
      setName(currentName);
      setError(null);
      setLoading(false);
      // Select all text so the user can immediately retype
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    }
  }, [open, currentName]);

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
    if (!trimmed || !shelfId) return;

    setLoading(true);
    setError(null);

    const res = await fetch(`/api/shelves/${shelfId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmed }),
    });

    if (!res.ok) {
      const text = await res.text();
      setError(text || "Failed to rename shelf.");
      setLoading(false);
      return;
    }

    updateShelf(shelfId, { name: trimmed });
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
        aria-labelledby="rename-shelf-title"
        className="fixed inset-x-4 top-[30vh] z-50 mx-auto max-w-sm overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-lg)]"
      >
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
          <h2
            id="rename-shelf-title"
            className="font-heading text-base font-semibold text-[var(--color-text-primary)]"
          >
            Rename shelf
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
            htmlFor="rename-shelf-input"
            className="mb-1.5 block text-sm text-[var(--color-text-secondary)]"
          >
            Shelf name
          </label>
          <input
            ref={inputRef}
            id="rename-shelf-input"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
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
              disabled={loading || !name.trim() || name.trim() === currentName}
              className="rounded-md bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-accent-hover)] disabled:opacity-60"
            >
              {loading ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
