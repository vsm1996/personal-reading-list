import { describe, it, expect } from 'vitest'
import { toBookPreview, toShelfWithPreview } from '@/lib/library-mappers'
import type { RawUserBook, RawShelf } from '@/lib/library-mappers'

// ─── Mock builders ────────────────────────────────────────────────────────────

function makeRawUserBook(overrides: Partial<RawUserBook> = {}): RawUserBook {
  return {
    id: 'ub-1',
    profileId: 'profile-1',
    bookId: 'book-1',
    shelfId: 'shelf-1',
    dateAdded: new Date('2024-01-15T10:00:00.000Z'),
    dateFinished: null,
    book: {
      id: 'book-1',
      openLibraryId: null,
      googleBooksId: null,
      title: 'Test Book',
      authors: ['Author One'],
      coverUrl: 'https://example.com/cover.jpg',
      pageCount: 320,
      publishYear: 2020,
      isbn10: null,
      isbn13: null,
      publisher: null,
      description: null,
      genres: [],
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      updatedAt: new Date('2024-01-01T00:00:00.000Z'),
    },
    readingProgress: null,
    rating: null,
    ...overrides,
  }
}

function makeRawShelf(overrides: Partial<RawShelf> = {}): RawShelf {
  return {
    id: 'shelf-1',
    profileId: 'profile-1',
    name: 'To Read',
    position: 0,
    isDefault: false,
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
    _count: { userBooks: 3 },
    userBooks: [],
    ...overrides,
  }
}

// ─── toBookPreview ─────────────────────────────────────────────────────────────

describe('toBookPreview', () => {
  it('maps all fields correctly', () => {
    const raw = makeRawUserBook()
    const result = toBookPreview(raw)

    expect(result.userBookId).toBe('ub-1')
    expect(result.bookId).toBe('book-1')
    expect(result.title).toBe('Test Book')
    expect(result.authors).toEqual(['Author One'])
    expect(result.coverUrl).toBe('https://example.com/cover.jpg')
    expect(result.pageCount).toBe(320)
    expect(result.publishYear).toBe(2020)
    expect(result.dateAdded).toBe('2024-01-15T10:00:00.000Z')
  })

  it('null readingProgress produces currentPage=null and percentage=null', () => {
    const raw = makeRawUserBook({ readingProgress: null })
    const result = toBookPreview(raw)

    expect(result.currentPage).toBeNull()
    expect(result.percentage).toBeNull()
  })

  it('null dateFinished maps to null', () => {
    const raw = makeRawUserBook({ dateFinished: null })
    const result = toBookPreview(raw)

    expect(result.dateFinished).toBeNull()
  })

  it('null rating maps to null', () => {
    const raw = makeRawUserBook({ rating: null })
    const result = toBookPreview(raw)

    expect(result.rating).toBeNull()
  })

  it('dateAdded.toISOString() is called correctly', () => {
    const date = new Date('2023-06-20T12:00:00.000Z')
    const raw = makeRawUserBook({ dateAdded: date })
    const result = toBookPreview(raw)

    expect(result.dateAdded).toBe('2023-06-20T12:00:00.000Z')
  })

  it('non-null readingProgress uses its currentPage and percentage values', () => {
    const raw = makeRawUserBook({
      readingProgress: {
        id: 'rp-1',
        userBookId: 'ub-1',
        currentPage: 150,
        percentage: 46.875,
        lastUpdated: new Date('2024-02-01T00:00:00.000Z'),
      },
    })
    const result = toBookPreview(raw)

    expect(result.currentPage).toBe(150)
    expect(result.percentage).toBe(46.875)
  })

  it('non-null rating uses the stars value', () => {
    const raw = makeRawUserBook({
      rating: {
        id: 'rating-1',
        userBookId: 'ub-1',
        stars: 4,
        createdAt: new Date('2024-02-01T00:00:00.000Z'),
        updatedAt: new Date('2024-02-01T00:00:00.000Z'),
      },
    })
    const result = toBookPreview(raw)

    expect(result.rating).toBe(4)
  })

  it('non-null dateFinished is converted to ISO string', () => {
    const finished = new Date('2024-03-10T08:00:00.000Z')
    const raw = makeRawUserBook({ dateFinished: finished })
    const result = toBookPreview(raw)

    expect(result.dateFinished).toBe('2024-03-10T08:00:00.000Z')
  })
})

// ─── toShelfWithPreview ────────────────────────────────────────────────────────

describe('toShelfWithPreview', () => {
  it('maps id, name, position, and isDefault correctly', () => {
    const raw = makeRawShelf({
      id: 'shelf-42',
      name: 'Currently Reading',
      position: 2,
      isDefault: true,
    })
    const result = toShelfWithPreview(raw)

    expect(result.id).toBe('shelf-42')
    expect(result.name).toBe('Currently Reading')
    expect(result.position).toBe(2)
    expect(result.isDefault).toBe(true)
  })

  it('bookCount comes from _count.userBooks', () => {
    const raw = makeRawShelf({ _count: { userBooks: 17 } })
    const result = toShelfWithPreview(raw)

    expect(result.bookCount).toBe(17)
  })

  it('preview is a mapped array of userBooks', () => {
    const ub1 = makeRawUserBook({ id: 'ub-1' })
    const ub2 = makeRawUserBook({
      id: 'ub-2',
      bookId: 'book-2',
      book: { ...ub1.book, id: 'book-2', title: 'Second Book' },
    })
    const raw = makeRawShelf({ userBooks: [ub1, ub2] })
    const result = toShelfWithPreview(raw)

    expect(result.preview).toHaveLength(2)
    expect(result.preview[0].userBookId).toBe('ub-1')
    expect(result.preview[1].userBookId).toBe('ub-2')
    expect(result.preview[1].title).toBe('Second Book')
  })

  it('empty userBooks produces an empty preview array', () => {
    const raw = makeRawShelf({ userBooks: [] })
    const result = toShelfWithPreview(raw)

    expect(result.preview).toEqual([])
  })
})
