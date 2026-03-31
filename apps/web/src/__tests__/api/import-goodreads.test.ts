import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('next/server', () => {
  class MockNextResponse extends Response {
    static json(data: unknown, init?: ResponseInit) {
      return new Response(JSON.stringify(data), {
        status: init?.status ?? 200,
        headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
      })
    }
  }
  return { NextResponse: MockNextResponse, NextRequest: Request }
})

vi.mock('@bookshelf/db', () => ({
  prisma: {
    shelf: { findMany: vi.fn() },
    book: { findFirst: vi.fn(), upsert: vi.fn(), create: vi.fn() },
    userBook: { create: vi.fn() },
    rating: { upsert: vi.fn() },
    $transaction: vi.fn(),
  },
}))

vi.mock('@/lib/api-auth', () => ({
  getAuthUser: vi.fn(),
  unauthorized: (msg = 'Unauthorized') => new Response(msg, { status: 401 }),
  forbidden: (msg = 'Forbidden') => new Response(msg, { status: 403 }),
  badRequest: (msg: string) => new Response(msg, { status: 400 }),
  notFound: (msg = 'Not found') => new Response(msg, { status: 404 }),
  conflict: (body: Record<string, unknown>) =>
    new Response(JSON.stringify(body), { status: 409, headers: { 'Content-Type': 'application/json' } }),
}))

import { getAuthUser } from '@/lib/api-auth'
import { prisma } from '@bookshelf/db'
import { POST } from '@/app/api/import/goodreads/route'

const mockGetAuthUser = vi.mocked(getAuthUser)
const mockPrisma = prisma as any

const MOCK_USER = { id: 'user-1', is_anonymous: false, app_metadata: {} }

const DEFAULT_SHELVES = [
  { id: 'wtr', name: 'Want to Read', isDefault: true, profileId: 'user-1', position: 0 },
  { id: 'cr',  name: 'Currently Reading', isDefault: true, profileId: 'user-1', position: 1 },
  { id: 'r',   name: 'Read', isDefault: true, profileId: 'user-1', position: 2 },
]

/** Build a minimal ImportBookInput */
function makeBook(overrides: Record<string, unknown> = {}) {
  return {
    title: 'Test Book',
    authors: ['Author One'],
    isbn13: '9780000000001',
    isbn10: null,
    pageCount: 300,
    shelf: 'want-to-read',
    rating: null,
    dateFinished: null,
    dateAdded: null,
    ...overrides,
  }
}

function makeRequest(books: unknown[]) {
  return new Request('http://localhost/api/import/goodreads', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ books }),
  })
}

/**
 * The route uses `prisma.$transaction(async (tx) => { ... })`.
 * This helper wires up the mock so the callback runs against a
 * tx object that delegates back to the top-level prisma mocks.
 */
function setupTransactionMock() {
  mockPrisma.$transaction.mockImplementation(async (callbackOrOps: unknown) => {
    if (typeof callbackOrOps === 'function') {
      // Interactive transaction — pass mocked prisma as tx
      const tx = {
        book: mockPrisma.book,
        userBook: mockPrisma.userBook,
        rating: mockPrisma.rating,
      }
      return callbackOrOps(tx)
    }
    // Array transaction (not used here)
    return Promise.all(callbackOrOps as Promise<unknown>[])
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGetAuthUser.mockResolvedValue(MOCK_USER as never)
  mockPrisma.shelf.findMany.mockResolvedValue(DEFAULT_SHELVES as never)
  setupTransactionMock()
})

describe('POST /api/import/goodreads', () => {
  describe('authentication', () => {
    it('returns 401 when unauthenticated', async () => {
      mockGetAuthUser.mockResolvedValue(null)
      const res = await POST(makeRequest([makeBook()]))
      expect(res.status).toBe(401)
    })
  })

  describe('input validation', () => {
    it('returns 400 when books array is empty', async () => {
      const res = await POST(makeRequest([]))
      expect(res.status).toBe(400)
    })

    it('returns 400 when body has no books field', async () => {
      const req = new Request('http://localhost/api/import/goodreads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const res = await POST(req)
      expect(res.status).toBe(400)
    })

    it('returns 400 when no default shelves exist for the user', async () => {
      mockPrisma.shelf.findMany.mockResolvedValue([] as never)
      const res = await POST(makeRequest([makeBook()]))
      expect(res.status).toBe(400)
    })
  })

  describe('successful import', () => {
    it('returns 200 with { imported, skipped } for a valid book', async () => {
      const mockBook = { id: 'book-1', isbn13: '9780000000001' }
      const mockUserBook = { id: 'ub-1' }
      mockPrisma.book.findFirst.mockResolvedValue(null as never)
      mockPrisma.book.create.mockResolvedValue(mockBook as never)
      mockPrisma.userBook.create.mockResolvedValue(mockUserBook as never)

      const res = await POST(makeRequest([makeBook()]))
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body).toMatchObject({ imported: 1, skipped: 0 })
    })

    it('skips books where both isbn13 and isbn10 are null', async () => {
      const res = await POST(makeRequest([makeBook({ isbn13: null, isbn10: null })]))
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body).toMatchObject({ imported: 0, skipped: 1 })
      expect(mockPrisma.book.upsert).not.toHaveBeenCalled()
      expect(mockPrisma.book.create).not.toHaveBeenCalled()
    })

    it('uses book.findFirst then create when isbn13 is present', async () => {
      mockPrisma.book.findFirst.mockResolvedValue(null as never)
      mockPrisma.book.create.mockResolvedValue({ id: 'book-1' } as never)
      mockPrisma.userBook.create.mockResolvedValue({ id: 'ub-1' } as never)

      await POST(makeRequest([makeBook({ isbn13: '9781234567890', isbn10: null })]))
      expect(mockPrisma.book.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { isbn13: '9781234567890' } })
      )
      expect(mockPrisma.book.create).toHaveBeenCalled()
    })

    it('uses book.findFirst then book.create when isbn10-only (no isbn13)', async () => {
      mockPrisma.book.findFirst.mockResolvedValue(null)
      mockPrisma.book.create.mockResolvedValue({ id: 'book-1' } as never)
      mockPrisma.userBook.create.mockResolvedValue({ id: 'ub-1' } as never)

      await POST(makeRequest([makeBook({ isbn13: null, isbn10: '0123456789' })]))
      expect(mockPrisma.book.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { isbn10: '0123456789' } })
      )
      expect(mockPrisma.book.create).toHaveBeenCalled()
    })

    it('reuses existing book when isbn10 found via findFirst', async () => {
      const existing = { id: 'existing-book' }
      mockPrisma.book.findFirst.mockResolvedValue(existing as never)
      mockPrisma.userBook.create.mockResolvedValue({ id: 'ub-1' } as never)

      await POST(makeRequest([makeBook({ isbn13: null, isbn10: '0123456789' })]))
      expect(mockPrisma.book.create).not.toHaveBeenCalled()
      expect(mockPrisma.userBook.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ bookId: 'existing-book' }) })
      )
    })
  })

  describe('shelf mapping', () => {
    it('maps "want-to-read" to the "Want to Read" shelf', async () => {
      mockPrisma.book.upsert.mockResolvedValue({ id: 'book-1' } as never)
      mockPrisma.userBook.create.mockResolvedValue({ id: 'ub-1' } as never)

      await POST(makeRequest([makeBook({ shelf: 'want-to-read' })]))
      expect(mockPrisma.userBook.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ shelfId: 'wtr' }) })
      )
    })

    it('maps "read" to the "Read" shelf', async () => {
      mockPrisma.book.upsert.mockResolvedValue({ id: 'book-1' } as never)
      mockPrisma.userBook.create.mockResolvedValue({ id: 'ub-1' } as never)

      await POST(makeRequest([makeBook({ shelf: 'read' })]))
      expect(mockPrisma.userBook.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ shelfId: 'r' }) })
      )
    })

    it('maps "currently-reading" to the "Currently Reading" shelf', async () => {
      mockPrisma.book.upsert.mockResolvedValue({ id: 'book-1' } as never)
      mockPrisma.userBook.create.mockResolvedValue({ id: 'ub-1' } as never)

      await POST(makeRequest([makeBook({ shelf: 'currently-reading' })]))
      expect(mockPrisma.userBook.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ shelfId: 'cr' }) })
      )
    })
  })

  describe('rating creation', () => {
    it('creates rating when book has rating > 0', async () => {
      const mockBook = { id: 'book-1' }
      const mockUserBook = { id: 'ub-1' }
      mockPrisma.book.upsert.mockResolvedValue(mockBook as never)
      mockPrisma.userBook.create.mockResolvedValue(mockUserBook as never)
      mockPrisma.rating.upsert.mockResolvedValue({ stars: 4 } as never)

      await POST(makeRequest([makeBook({ rating: 4 })]))
      expect(mockPrisma.rating.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userBookId: 'ub-1' },
          create: expect.objectContaining({ stars: 4 }),
        })
      )
    })

    it('does not create rating when rating is null', async () => {
      mockPrisma.book.upsert.mockResolvedValue({ id: 'book-1' } as never)
      mockPrisma.userBook.create.mockResolvedValue({ id: 'ub-1' } as never)

      await POST(makeRequest([makeBook({ rating: null })]))
      expect(mockPrisma.rating.upsert).not.toHaveBeenCalled()
    })

    it('does not create rating when rating is 0', async () => {
      mockPrisma.book.upsert.mockResolvedValue({ id: 'book-1' } as never)
      mockPrisma.userBook.create.mockResolvedValue({ id: 'ub-1' } as never)

      await POST(makeRequest([makeBook({ rating: 0 })]))
      expect(mockPrisma.rating.upsert).not.toHaveBeenCalled()
    })
  })

  describe('duplicate handling', () => {
    it('counts as skipped when userBook.create throws P2002 (unique constraint)', async () => {
      mockPrisma.book.upsert.mockResolvedValue({ id: 'book-1' } as never)
      mockPrisma.userBook.create.mockRejectedValue({ code: 'P2002' })

      const res = await POST(makeRequest([makeBook()]))
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body).toMatchObject({ imported: 0, skipped: 1 })
    })
  })

  describe('batch counting', () => {
    it('returns correct imported/skipped counts for mixed batch', async () => {
      const goodBook = makeBook({ isbn13: '9780000000001' })
      const noIsbnBook = makeBook({ isbn13: null, isbn10: null })
      const duplicateBook = makeBook({ isbn13: '9780000000002' })

      mockPrisma.book.upsert
        .mockResolvedValueOnce({ id: 'book-1' } as never)
        .mockResolvedValueOnce({ id: 'book-2' } as never)
      mockPrisma.userBook.create
        .mockResolvedValueOnce({ id: 'ub-1' } as never)
        .mockRejectedValueOnce({ code: 'P2002' }) // duplicate

      const res = await POST(makeRequest([goodBook, noIsbnBook, duplicateBook]))
      const body = await res.json()
      // goodBook: imported +1, noIsbn: skipped +1, duplicate: skipped +1
      expect(body).toMatchObject({ imported: 1, skipped: 2 })
    })
  })
})
