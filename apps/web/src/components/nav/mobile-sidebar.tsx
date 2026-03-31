"use client";

import { useUIStore } from "@/stores/ui.store";
import { X } from "lucide-react";
import { useEffect } from "react";

type Props = { children: React.ReactNode };

/**
 * Mobile sidebar drawer. Wraps the ShelfNav children passed from the Server
 * Component layout so we have a single "use client" boundary — ShelfNav itself
 * stays a Server Component.
 *
 * Behaviour:
 *  - Slides in from the left when sidebarOpen is true
 *  - Backdrop click and Escape close it
 *  - Locks body scroll while open
 */
export function MobileSidebar({ children }: Props) {
  const open = useUIStore((s) => s.sidebarOpen);
  const close = useUIStore((s) => s.closeSidebar);

  // Close on Escape + lock scroll
  useEffect(() => {
    if (!open) return;

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, close]);

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-overlay backdrop-blur-sm lg:hidden"
          onClick={close}
          aria-hidden
        />
      )}

      {/* Drawer */}
      <aside
        aria-label="Navigation"
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-border bg-bg-secondary lg:hidden ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{
          transition: `transform var(--renge-duration-3) var(--renge-easing-ease-out)`,
        }}
      >
        <div className="flex items-center justify-between px-5 py-4">
          <span className="font-heading text-lg font-semibold text-text-primary">
            Bookshelf
          </span>
          <button
            onClick={close}
            aria-label="Close navigation"
            className="rounded-md p-1.5 text-text-tertiary hover:bg-bg-tertiary"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">{children}</div>
      </aside>
    </>
  );
}
