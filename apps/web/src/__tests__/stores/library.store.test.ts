import { describe, it, expect, beforeEach } from 'vitest'
import { useLibraryStore } from '@/stores/library.store'
import type { BookPreview, ShelfWithPreview } from '@/types/library'

// ─── Helpers ──────────────────────────────────────────────────────────────────

let _shelfCounter = 0
let _bookCounter = 0

function makeShelf(overrides: Partial<ShelfWithPreview> = {}): ShelfWithPreview {
  const n = ++_shelfCounter
  return {
    id: `shelf-${n}`,
    name: `Shelf ${n}`,
    position: n - 1,
    isDefault: false,
    bookCount: 0,
    preview: [],
    ...overrides,
  }
}

function makeBook(overrides: Partial<BookPreview> = {}): BookPreview {
  const n = ++_bookCounter
  return {
    userBookId: `ub-${n}`,
    bookId: `book-${n}`,
    title: `Book ${n}`,
    authors: ['Author'],
    coverUrl: null,
    pageCount: null,
    publishYear: null,
    currentPage: null,
    percentage: null,
    dateAdded: new Date().toISOString(),
    dateFinished: null,
    rating: null,
    ...overrides,
  }
}

// ─── Reset store before each test ─────────────────────────────────────────────

beforeEach(() => {
  _shelfCounter = 0
  _bookCounter = 0
  useLibraryStore.setState({ shelves: [], hydrated: false })
})

// ─── hydrate ──────────────────────────────────────────────────────────────────

describe('hydrate', () => {
  it('sets shelves and marks hydrated: true', () => {
    const shelf = makeShelf()
    useLibraryStore.getState().hydrate([shelf])

    const { shelves, hydrated } = useLibraryStore.getState()
    expect(hydrated).toBe(true)
    expect(shelves).toHaveLength(1)
    expect(shelves[0]!.id).toBe(shelf.id)
  })

  it('calling hydrate again overwrites shelves', () => {
    const shelf1 = makeShelf()
    const shelf2 = makeShelf()
    useLibraryStore.getState().hydrate([shelf1])
    useLibraryStore.getState().hydrate([shelf2])

    const { shelves } = useLibraryStore.getState()
    expect(shelves).toHaveLength(1)
    expect(shelves[0]!.id).toBe(shelf2.id)
  })
})

// ─── addShelf ─────────────────────────────────────────────────────────────────

describe('addShelf', () => {
  it('appends shelf to the end of the list', () => {
    const shelf1 = makeShelf()
    const shelf2 = makeShelf()
    useLibraryStore.getState().hydrate([shelf1])
    useLibraryStore.getState().addShelf(shelf2)

    const { shelves } = useLibraryStore.getState()
    expect(shelves[1]!.id).toBe(shelf2.id)
  })

  it('increments shelf count', () => {
    const shelf = makeShelf()
    useLibraryStore.getState().hydrate([shelf])
    useLibraryStore.getState().addShelf(makeShelf())

    expect(useLibraryStore.getState().shelves).toHaveLength(2)
  })
})

// ─── updateShelf ──────────────────────────────────────────────────────────────

describe('updateShelf', () => {
  it('updates name by id', () => {
    const shelf = makeShelf({ name: 'Old Name' })
    useLibraryStore.getState().hydrate([shelf])
    useLibraryStore.getState().updateShelf(shelf.id, { name: 'New Name' })

    const updated = useLibraryStore.getState().shelves[0]!
    expect(updated.name).toBe('New Name')
  })

  it('updates position by id', () => {
    const shelf = makeShelf({ position: 0 })
    useLibraryStore.getState().hydrate([shelf])
    useLibraryStore.getState().updateShelf(shelf.id, { position: 5 })

    const updated = useLibraryStore.getState().shelves[0]!
    expect(updated.position).toBe(5)
  })

  it('ignores unknown id', () => {
    const shelf = makeShelf({ name: 'Original' })
    useLibraryStore.getState().hydrate([shelf])
    useLibraryStore.getState().updateShelf('nonexistent-id', { name: 'Changed' })

    const unchanged = useLibraryStore.getState().shelves[0]!
    expect(unchanged.name).toBe('Original')
  })
})

// ─── removeShelf ──────────────────────────────────────────────────────────────

describe('removeShelf', () => {
  it('removes shelf by id', () => {
    const shelf = makeShelf()
    useLibraryStore.getState().hydrate([shelf])
    useLibraryStore.getState().removeShelf(shelf.id)

    expect(useLibraryStore.getState().shelves).toHaveLength(0)
  })

  it('leaves other shelves intact', () => {
    const shelf1 = makeShelf()
    const shelf2 = makeShelf()
    useLibraryStore.getState().hydrate([shelf1, shelf2])
    useLibraryStore.getState().removeShelf(shelf1.id)

    const { shelves } = useLibraryStore.getState()
    expect(shelves).toHaveLength(1)
    expect(shelves[0]!.id).toBe(shelf2.id)
  })
})

// ─── reorderShelves ───────────────────────────────────────────────────────────

describe('reorderShelves', () => {
  it('reassigns position based on orderedIds index', () => {
    const shelf1 = makeShelf({ position: 0 })
    const shelf2 = makeShelf({ position: 1 })
    const shelf3 = makeShelf({ position: 2 })
    useLibraryStore.getState().hydrate([shelf1, shelf2, shelf3])

    useLibraryStore.getState().reorderShelves([shelf3.id, shelf1.id, shelf2.id])

    const { shelves } = useLibraryStore.getState()
    const byId = Object.fromEntries(shelves.map((s) => [s.id, s]))
    expect(byId[shelf3.id]!.position).toBe(0)
    expect(byId[shelf1.id]!.position).toBe(1)
    expect(byId[shelf2.id]!.position).toBe(2)
  })

  it('filters out unknown ids — returns only matched shelves', () => {
    const shelf1 = makeShelf()
    const shelf2 = makeShelf()
    useLibraryStore.getState().hydrate([shelf1, shelf2])

    useLibraryStore.getState().reorderShelves([shelf1.id, 'does-not-exist'])

    const { shelves } = useLibraryStore.getState()
    expect(shelves).toHaveLength(1)
    expect(shelves[0]!.id).toBe(shelf1.id)
  })

  it('first id gets position 0', () => {
    const shelf1 = makeShelf({ position: 10 })
    const shelf2 = makeShelf({ position: 11 })
    useLibraryStore.getState().hydrate([shelf1, shelf2])

    useLibraryStore.getState().reorderShelves([shelf2.id, shelf1.id])

    const { shelves } = useLibraryStore.getState()
    expect(shelves.find((s) => s.id === shelf2.id)!.position).toBe(0)
  })
})

// ─── addBook ──────────────────────────────────────────────────────────────────

describe('addBook', () => {
  it('increments bookCount on the correct shelf', () => {
    const shelf = makeShelf({ bookCount: 2 })
    useLibraryStore.getState().hydrate([shelf])
    useLibraryStore.getState().addBook(shelf.id, makeBook())

    expect(useLibraryStore.getState().shelves[0]!.bookCount).toBe(3)
  })

  it('prepends book to preview', () => {
    const existingBook = makeBook()
    const shelf = makeShelf({ bookCount: 1, preview: [existingBook] })
    const newBook = makeBook()
    useLibraryStore.getState().hydrate([shelf])
    useLibraryStore.getState().addBook(shelf.id, newBook)

    const preview = useLibraryStore.getState().shelves[0]!.preview
    expect(preview[0]!.userBookId).toBe(newBook.userBookId)
    expect(preview[1]!.userBookId).toBe(existingBook.userBookId)
  })

  it('does NOT prepend when preview already has 8 books', () => {
    const preview = Array.from({ length: 8 }, () => makeBook())
    const shelf = makeShelf({ bookCount: 8, preview })
    useLibraryStore.getState().hydrate([shelf])
    useLibraryStore.getState().addBook(shelf.id, makeBook())

    const updatedPreview = useLibraryStore.getState().shelves[0]!.preview
    expect(updatedPreview).toHaveLength(8)
    // The original 8 books should remain unchanged
    expect(updatedPreview[0]!.userBookId).toBe(preview[0]!.userBookId)
  })

  it('does not affect other shelves', () => {
    const shelf1 = makeShelf({ bookCount: 1 })
    const shelf2 = makeShelf({ bookCount: 5 })
    useLibraryStore.getState().hydrate([shelf1, shelf2])
    useLibraryStore.getState().addBook(shelf1.id, makeBook())

    expect(useLibraryStore.getState().shelves[1]!.bookCount).toBe(5)
  })
})

// ─── removeBook ───────────────────────────────────────────────────────────────

describe('removeBook', () => {
  it('decrements bookCount', () => {
    const book = makeBook()
    const shelf = makeShelf({ bookCount: 3, preview: [book] })
    useLibraryStore.getState().hydrate([shelf])
    useLibraryStore.getState().removeBook(book.userBookId, shelf.id)

    expect(useLibraryStore.getState().shelves[0]!.bookCount).toBe(2)
  })

  it('removes book from preview', () => {
    const book = makeBook()
    const shelf = makeShelf({ bookCount: 1, preview: [book] })
    useLibraryStore.getState().hydrate([shelf])
    useLibraryStore.getState().removeBook(book.userBookId, shelf.id)

    expect(useLibraryStore.getState().shelves[0]!.preview).toHaveLength(0)
  })

  it('bookCount never goes below 0 when removing from empty shelf', () => {
    const shelf = makeShelf({ bookCount: 0, preview: [] })
    useLibraryStore.getState().hydrate([shelf])
    useLibraryStore.getState().removeBook('nonexistent-ub', shelf.id)

    expect(useLibraryStore.getState().shelves[0]!.bookCount).toBe(0)
  })
})

// ─── moveBook ─────────────────────────────────────────────────────────────────

describe('moveBook', () => {
  it('decrements fromShelf bookCount', () => {
    const book = makeBook()
    const fromShelf = makeShelf({ bookCount: 4, preview: [book] })
    const toShelf = makeShelf({ bookCount: 1, preview: [] })
    useLibraryStore.getState().hydrate([fromShelf, toShelf])

    useLibraryStore.getState().moveBook(book.userBookId, fromShelf.id, toShelf.id)

    expect(useLibraryStore.getState().shelves[0]!.bookCount).toBe(3)
  })

  it('removes book from fromShelf preview', () => {
    const book = makeBook()
    const fromShelf = makeShelf({ bookCount: 1, preview: [book] })
    const toShelf = makeShelf({ bookCount: 0, preview: [] })
    useLibraryStore.getState().hydrate([fromShelf, toShelf])

    useLibraryStore.getState().moveBook(book.userBookId, fromShelf.id, toShelf.id)

    expect(useLibraryStore.getState().shelves[0]!.preview).toHaveLength(0)
  })

  it('increments toShelf bookCount', () => {
    const book = makeBook()
    const fromShelf = makeShelf({ bookCount: 2, preview: [book] })
    const toShelf = makeShelf({ bookCount: 1, preview: [] })
    useLibraryStore.getState().hydrate([fromShelf, toShelf])

    useLibraryStore.getState().moveBook(book.userBookId, fromShelf.id, toShelf.id)

    expect(useLibraryStore.getState().shelves[1]!.bookCount).toBe(2)
  })

  it('prepends book to toShelf preview if under 8 book limit', () => {
    const book = makeBook()
    const existingBook = makeBook()
    const fromShelf = makeShelf({ bookCount: 1, preview: [book] })
    const toShelf = makeShelf({ bookCount: 1, preview: [existingBook] })
    useLibraryStore.getState().hydrate([fromShelf, toShelf])

    useLibraryStore.getState().moveBook(book.userBookId, fromShelf.id, toShelf.id)

    const toPreview = useLibraryStore.getState().shelves[1]!.preview
    expect(toPreview[0]!.userBookId).toBe(book.userBookId)
    expect(toPreview[1]!.userBookId).toBe(existingBook.userBookId)
  })

  it('does not add to toShelf preview if already at 8 books', () => {
    const book = makeBook()
    const toPreview = Array.from({ length: 8 }, () => makeBook())
    const fromShelf = makeShelf({ bookCount: 1, preview: [book] })
    const toShelf = makeShelf({ bookCount: 8, preview: toPreview })
    useLibraryStore.getState().hydrate([fromShelf, toShelf])

    useLibraryStore.getState().moveBook(book.userBookId, fromShelf.id, toShelf.id)

    expect(useLibraryStore.getState().shelves[1]!.preview).toHaveLength(8)
  })

  it('handles case where book is not in fromShelf preview — count still decrements', () => {
    const fromShelf = makeShelf({ bookCount: 3, preview: [] })
    const toShelf = makeShelf({ bookCount: 0, preview: [] })
    useLibraryStore.getState().hydrate([fromShelf, toShelf])

    useLibraryStore.getState().moveBook('ghost-ub', fromShelf.id, toShelf.id)

    // fromShelf count still decrements
    expect(useLibraryStore.getState().shelves[0]!.bookCount).toBe(2)
    // toShelf count does NOT increment (book was not found in preview)
    expect(useLibraryStore.getState().shelves[1]!.bookCount).toBe(0)
  })
})

// ─── updateProgress ───────────────────────────────────────────────────────────

describe('updateProgress', () => {
  it('updates currentPage and percentage on matching book', () => {
    const book = makeBook({ currentPage: 0, percentage: 0 })
    const shelf = makeShelf({ preview: [book] })
    useLibraryStore.getState().hydrate([shelf])

    useLibraryStore.getState().updateProgress(book.userBookId, shelf.id, 100, 31.25)

    const updated = useLibraryStore.getState().shelves[0]!.preview[0]!
    expect(updated.currentPage).toBe(100)
    expect(updated.percentage).toBe(31.25)
  })

  it('does not affect other books in the same shelf', () => {
    const book1 = makeBook({ currentPage: 0 })
    const book2 = makeBook({ currentPage: 50 })
    const shelf = makeShelf({ preview: [book1, book2] })
    useLibraryStore.getState().hydrate([shelf])

    useLibraryStore.getState().updateProgress(book1.userBookId, shelf.id, 200, 62.5)

    const previews = useLibraryStore.getState().shelves[0]!.preview
    expect(previews[1]!.currentPage).toBe(50)
  })

  it('does not affect other shelves', () => {
    const book = makeBook({ currentPage: 0 })
    const shelf1 = makeShelf({ preview: [book] })
    const book2 = makeBook({ currentPage: 30 })
    const shelf2 = makeShelf({ preview: [book2] })
    useLibraryStore.getState().hydrate([shelf1, shelf2])

    useLibraryStore.getState().updateProgress(book.userBookId, shelf1.id, 99, 30)

    const shelf2Preview = useLibraryStore.getState().shelves[1]!.preview[0]!
    expect(shelf2Preview.currentPage).toBe(30)
  })
})
