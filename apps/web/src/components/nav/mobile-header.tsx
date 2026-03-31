"use client";

import { useUIStore } from "@/stores/ui.store";
import { Menu } from "lucide-react";

/**
 * Top bar shown on mobile — contains the hamburger that opens the drawer.
 * Hidden on lg+ where the persistent sidebar is visible.
 */
export function MobileHeader() {
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);

  return (
    <header className="flex items-center justify-between border-b border-border bg-bg-secondary px-4 py-3 lg:hidden">
      <button
        onClick={toggleSidebar}
        aria-label="Open navigation"
        className="rounded-md p-1.5 text-text-secondary transition-colors hover:bg-bg-tertiary"
      >
        <Menu size={20} />
      </button>
      <span className="font-heading text-base font-semibold text-text-primary">
        Bookshelf
      </span>
      {/* Spacer to keep heading centered */}
      <div className="w-8" aria-hidden />
    </header>
  );
}
