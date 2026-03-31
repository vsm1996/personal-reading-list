"use client";

import { ShelfSection } from "@/components/library/shelf-section";
import { useLibraryStore } from "@/stores/library.store";
import { useUIStore } from "@/stores/ui.store";
import type { ShelfWithPreview } from "@/types/library";
import { Plus } from "lucide-react";
import { useEffect } from "react";

type Props = {
  initialShelves: ShelfWithPreview[];
};

export function LibraryClient({ initialShelves }: Props) {
  const hydrate = useLibraryStore((s) => s.hydrate);
  const hydrated = useLibraryStore((s) => s.hydrated);
  const shelves = useLibraryStore((s) => s.shelves);
  const openCreateShelf = useUIStore((s) => s.openCreateShelf);

  // Hydrate once — subsequent updates come through Zustand mutations
  useEffect(() => {
    if (!hydrated) hydrate(initialShelves);
  }, [hydrated, hydrate, initialShelves]);

  const displayShelves = hydrated ? shelves : initialShelves;

  return (
    <div className="space-y-10">
      {displayShelves.map((shelf, index) => (
        <ShelfSection key={shelf.id} shelf={shelf} index={index} />
      ))}

      {/* Add custom shelf */}
      <button
        onClick={openCreateShelf}
        className="flex items-center gap-2 rounded-lg border border-dashed border-border px-4 py-3 text-sm text-text-tertiary transition-colors hover:border-accent hover:text-accent"
      >
        <Plus size={16} />
        New shelf
      </button>
    </div>
  );
}
