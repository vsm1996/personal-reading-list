import { create } from "zustand";

export type Toast = {
  id: string;
  type: "success" | "error" | "info";
  message: string;
};

interface UIStore {
  // Add book modal — opened from shelf row or search button
  addBookModal: { open: boolean; shelfId: string | null };
  openAddBook: (shelfId?: string) => void;
  closeAddBook: () => void;

  // Create shelf modal
  createShelfModal: boolean;
  openCreateShelf: () => void;
  closeCreateShelf: () => void;

  // Rename shelf modal
  renameShelfModal: { open: boolean; shelfId: string | null; currentName: string };
  openRenameShelf: (shelfId: string, currentName: string) => void;
  closeRenameShelf: () => void;

  // Delete shelf confirmation
  deleteShelfModal: { open: boolean; shelfId: string | null; shelfName: string };
  openDeleteShelf: (shelfId: string, shelfName: string) => void;
  closeDeleteShelf: () => void;

  // Mobile sidebar
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  closeSidebar: () => void;

  // Toast notifications
  toasts: Toast[];
  addToast: (toast: Omit<Toast, "id">) => void;
  removeToast: (id: string) => void;
}

export const useUIStore = create<UIStore>()((set) => ({
  addBookModal: { open: false, shelfId: null },
  openAddBook: (shelfId?: string) =>
    set({ addBookModal: { open: true, shelfId: shelfId ?? null } }),
  closeAddBook: () =>
    set({ addBookModal: { open: false, shelfId: null } }),

  createShelfModal: false,
  openCreateShelf: () => set({ createShelfModal: true }),
  closeCreateShelf: () => set({ createShelfModal: false }),

  renameShelfModal: { open: false, shelfId: null, currentName: "" },
  openRenameShelf: (shelfId, currentName) =>
    set({ renameShelfModal: { open: true, shelfId, currentName } }),
  closeRenameShelf: () =>
    set({ renameShelfModal: { open: false, shelfId: null, currentName: "" } }),

  deleteShelfModal: { open: false, shelfId: null, shelfName: "" },
  openDeleteShelf: (shelfId, shelfName) =>
    set({ deleteShelfModal: { open: true, shelfId, shelfName } }),
  closeDeleteShelf: () =>
    set({ deleteShelfModal: { open: false, shelfId: null, shelfName: "" } }),

  sidebarOpen: false,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  closeSidebar: () => set({ sidebarOpen: false }),

  toasts: [],
  addToast: (toast) =>
    set((s) => ({ toasts: [...s.toasts, { ...toast, id: crypto.randomUUID() }] })),
  removeToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
