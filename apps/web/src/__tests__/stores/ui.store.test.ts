import { describe, it, expect, beforeEach } from 'vitest'
import { useUIStore } from '@/stores/ui.store'

// ─── Reset store before each test ─────────────────────────────────────────────

const initialState = {
  addBookModal: { open: false, shelfId: null },
  createShelfModal: false,
  renameShelfModal: { open: false, shelfId: null, currentName: '' },
  deleteShelfModal: { open: false, shelfId: null, shelfName: '' },
  sidebarOpen: false,
  toasts: [],
}

beforeEach(() => {
  useUIStore.setState(initialState)
})

// ─── addBookModal ─────────────────────────────────────────────────────────────

describe('addBookModal', () => {
  it('openAddBook() sets open=true and shelfId=null', () => {
    useUIStore.getState().openAddBook()
    const { addBookModal } = useUIStore.getState()
    expect(addBookModal.open).toBe(true)
    expect(addBookModal.shelfId).toBeNull()
  })

  it('openAddBook("shelf-1") sets open=true and shelfId="shelf-1"', () => {
    useUIStore.getState().openAddBook('shelf-1')
    const { addBookModal } = useUIStore.getState()
    expect(addBookModal.open).toBe(true)
    expect(addBookModal.shelfId).toBe('shelf-1')
  })

  it('closeAddBook() sets open=false and shelfId=null', () => {
    useUIStore.getState().openAddBook('shelf-1')
    useUIStore.getState().closeAddBook()
    const { addBookModal } = useUIStore.getState()
    expect(addBookModal.open).toBe(false)
    expect(addBookModal.shelfId).toBeNull()
  })
})

// ─── createShelfModal ─────────────────────────────────────────────────────────

describe('createShelfModal', () => {
  it('openCreateShelf() sets createShelfModal to true', () => {
    useUIStore.getState().openCreateShelf()
    expect(useUIStore.getState().createShelfModal).toBe(true)
  })

  it('closeCreateShelf() sets createShelfModal to false', () => {
    useUIStore.getState().openCreateShelf()
    useUIStore.getState().closeCreateShelf()
    expect(useUIStore.getState().createShelfModal).toBe(false)
  })
})

// ─── renameShelfModal ─────────────────────────────────────────────────────────

describe('renameShelfModal', () => {
  it('openRenameShelf("shelf-1", "My Shelf") sets open=true, shelfId, and currentName', () => {
    useUIStore.getState().openRenameShelf('shelf-1', 'My Shelf')
    const { renameShelfModal } = useUIStore.getState()
    expect(renameShelfModal.open).toBe(true)
    expect(renameShelfModal.shelfId).toBe('shelf-1')
    expect(renameShelfModal.currentName).toBe('My Shelf')
  })

  it('closeRenameShelf() resets to { open: false, shelfId: null, currentName: "" }', () => {
    useUIStore.getState().openRenameShelf('shelf-1', 'My Shelf')
    useUIStore.getState().closeRenameShelf()
    const { renameShelfModal } = useUIStore.getState()
    expect(renameShelfModal.open).toBe(false)
    expect(renameShelfModal.shelfId).toBeNull()
    expect(renameShelfModal.currentName).toBe('')
  })
})

// ─── deleteShelfModal ─────────────────────────────────────────────────────────

describe('deleteShelfModal', () => {
  it('openDeleteShelf("shelf-1", "My Shelf") sets open=true, shelfId, and shelfName', () => {
    useUIStore.getState().openDeleteShelf('shelf-1', 'My Shelf')
    const { deleteShelfModal } = useUIStore.getState()
    expect(deleteShelfModal.open).toBe(true)
    expect(deleteShelfModal.shelfId).toBe('shelf-1')
    expect(deleteShelfModal.shelfName).toBe('My Shelf')
  })

  it('closeDeleteShelf() resets to { open: false, shelfId: null, shelfName: "" }', () => {
    useUIStore.getState().openDeleteShelf('shelf-1', 'My Shelf')
    useUIStore.getState().closeDeleteShelf()
    const { deleteShelfModal } = useUIStore.getState()
    expect(deleteShelfModal.open).toBe(false)
    expect(deleteShelfModal.shelfId).toBeNull()
    expect(deleteShelfModal.shelfName).toBe('')
  })
})

// ─── sidebarOpen ──────────────────────────────────────────────────────────────

describe('sidebarOpen', () => {
  it('toggleSidebar() flips false to true', () => {
    useUIStore.getState().toggleSidebar()
    expect(useUIStore.getState().sidebarOpen).toBe(true)
  })

  it('toggleSidebar() twice goes back to false', () => {
    useUIStore.getState().toggleSidebar()
    useUIStore.getState().toggleSidebar()
    expect(useUIStore.getState().sidebarOpen).toBe(false)
  })

  it('closeSidebar() sets sidebarOpen to false regardless of current state', () => {
    useUIStore.getState().toggleSidebar() // open it
    useUIStore.getState().closeSidebar()
    expect(useUIStore.getState().sidebarOpen).toBe(false)
  })
})

// ─── toasts ───────────────────────────────────────────────────────────────────

describe('toasts', () => {
  it('addToast({ type: "success", message: "Done" }) adds a toast with a string id', () => {
    useUIStore.getState().addToast({ type: 'success', message: 'Done' })
    const { toasts } = useUIStore.getState()
    expect(toasts).toHaveLength(1)
    expect(typeof toasts[0]!.id).toBe('string')
    expect(toasts[0]!.id.length).toBeGreaterThan(0)
  })

  it('multiple addToast calls each get unique ids', () => {
    useUIStore.getState().addToast({ type: 'success', message: 'First' })
    useUIStore.getState().addToast({ type: 'error', message: 'Second' })
    const { toasts } = useUIStore.getState()
    expect(toasts).toHaveLength(2)
    expect(toasts[0]!.id).not.toBe(toasts[1]!.id)
  })

  it('removeToast(id) removes only that toast and leaves others', () => {
    useUIStore.getState().addToast({ type: 'success', message: 'First' })
    useUIStore.getState().addToast({ type: 'info', message: 'Second' })
    const idToRemove = useUIStore.getState().toasts[0]!.id
    useUIStore.getState().removeToast(idToRemove)

    const { toasts } = useUIStore.getState()
    expect(toasts).toHaveLength(1)
    expect(toasts[0]!.message).toBe('Second')
  })

  it('toast type is preserved correctly', () => {
    useUIStore.getState().addToast({ type: 'error', message: 'Oops' })
    const toast = useUIStore.getState().toasts[0]!
    expect(toast.type).toBe('error')
    expect(toast.message).toBe('Oops')
  })
})
