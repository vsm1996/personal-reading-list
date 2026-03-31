"use client";

import { useLibraryStore } from "@/stores/library.store";
import { useUIStore } from "@/stores/ui.store";
import { Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

export function DeleteShelfModal() {
  const { open, shelfId, shelfName } = useUIStore((s) => s.deleteShelfModal);
  const close = useUIStore((s) => s.closeDeleteShelf);
  const removeShelf = useLibraryStore((s) => s.removeShelf);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setError(null);
      setLoading(false);
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

  async function handleDelete() {
    if (!shelfId) return;
    setLoading(true);
    setError(null);

    const res = await fetch(`/api/shelves/${shelfId}`, { method: "DELETE" });

    if (!res.ok) {
      const text = await res.text();
      setError(text || "Failed to delete shelf.");
      setLoading(false);
      return;
    }

    // Books were moved to "Want to Read" server-side — optimistically remove
    // the shelf from the local store (library page will reconcile on next load)
    removeShelf(shelfId);
    close();
  }

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-overlay backdrop-blur-sm"
        onClick={close}
        aria-hidden
      />

      <div
        role="alertdialog"
        aria-modal
        aria-labelledby="delete-shelf-title"
        aria-describedby="delete-shelf-desc"
        className="modal-entrance fixed inset-x-4 top-[30vh] z-50 mx-auto max-w-sm overflow-hidden rounded-xl border border-border bg-surface shadow-lg"
      >
        <div className="p-6">
          <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-error/10">
            <Trash2 size={18} className="text-error" />
          </div>

          <h2
            id="delete-shelf-title"
            className="font-heading text-base font-semibold text-text-primary"
          >
            Delete &ldquo;{shelfName}&rdquo;?
          </h2>
          <p
            id="delete-shelf-desc"
            className="mt-2 text-sm text-text-secondary"
          >
            Any books on this shelf will be moved to{" "}
            <span className="font-medium text-text-primary">
              Want to Read
            </span>
            . This cannot be undone.
          </p>

          {error && (
            <p className="mt-3 text-xs text-error">{error}</p>
          )}

          <div className="mt-6 flex justify-end gap-2">
            <button
              onClick={close}
              className="rounded-md px-4 py-2 text-sm text-text-secondary transition-colors hover:bg-bg-tertiary"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={loading}
              className="rounded-md bg-error px-4 py-2 text-sm font-semibold text-text-on-accent transition-colors hover:opacity-90 disabled:opacity-60"
            >
              {loading ? "Deleting…" : "Delete shelf"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
