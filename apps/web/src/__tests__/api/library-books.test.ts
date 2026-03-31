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
    shelf: { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    userBook: {
      findFirst: vi.fn(), findMany: vi.fn(), count: vi.fn(),
      create: vi.fn(), update: vi.fn(), updateMany: vi.fn(), delete: vi.fn(), deleteMany: vi.fn(),
    },
    book: { findFirst: vi.fn(), findMany: vi.fn(), upsert: vi.fn(), create: vi.fn() },
    readingProgress: { upsert: vi.fn() },
    progressHistory: { create: vi.fn() },
    rating: { upsert: vi.fn(), deleteMany: vi.fn() },
    note: { upsert: vi.fn(), deleteMany: vi.fn() },
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
import { POST, DELETE } from '@/app/api/library/books/route'

const mockGetAuthUser = vi.mocked(getAuthUser)
const mockPrisma = prisma as any

const MOCK_USER = { id: 'user-1', is_anonymous: false, app_metadata: {} }

beforeEach(() => { vi.clearAllMocks() })

function makePostRequest(body: unknown) {
  return new Request('http://localhost/api/library/books', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function makeDeleteRequest(userBookId?: string) {
  const url = userBookId
    ? `http://localhost/api/library/books?userBookId=${userBookId}`
    : 'http://localhost/api/library/books'
  return new Request(url, { method: 'DELETE' })
}

const VALID_BOOK = {
  openLibraryId: 'OL123M',
  title: 'Test Book',
  authors: ['Author One'],
  coverUrl: 'https://covers.openlibrary.org/b/id/1234-L.jpg',
  publishYear: 2020,
  pageCount: 300,
  isbn13: '9781234567890',
  isbn10: '1234567890',
  publisher: 'Test Publisher',
}

describe('POST /api/library/books', () => {
  it('returns 401 when unauthenticated', async () => {
    mockGetAuthUser.mockResolvedValue(null)
    const res = await POST(makePostRequest({ book: VALID_BOOK, shelfId: 'shelf-1' }))
    expect(res.status).toBe(401)
  })

  it('returns 400 when shelfId is missing from body', async () => {
    mockGetAuthUser.mockResolvedValue(MOCK_USER as never)
    const res = await POST(makePostRequest({ book: VALID_BOOK }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when book.openLibraryId is missing', async () => {
    mockGetAuthUser.mockResolvedValue(MOCK_USER as never)
    const bookWithoutId = { ...VALID_BOOK, openLibraryId: undefined }
    const res = await POST(makePostRequest({ book: bookWithoutId, shelfId: 'shelf-1' }))
    expect(res.status).toBe(400)
  })

  it('returns 404 when shelfId does not belong to the user (IDOR)', async () => {
    mockGetAuthUser.mockResolvedValue(MOCK_USER as never)
    mockPrisma.shelf.findFirst.mockResolvedValue(null)
    const res = await POST(makePostRequest({ book: VALID_BOOK, shelfId: 'other-users-shelf' }))
    expect(res.status).toBe(404)
  })

  it('returns 409 when book is already in the user library', async () => {
    mockGetAuthUser.mockResolvedValue(MOCK_USER as never)
    mockPrisma.shelf.findFirst.mockResolvedValue({ id: 'shelf-1', profileId: 'user-1', name: 'My Shelf' } as never)
    mockPrisma.userBook.findFirst.mockResolvedValue({
      id: 'ub-1',
      profileId: 'user-1',
      shelf: { name: 'My Shelf' },
    } as never)
    const res = await POST(makePostRequest({ book: VALID_BOOK, shelfId: 'shelf-1' }))
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body).toHaveProperty('error')
    expect(body).toHaveProperty('message')
  })

  it('strips non-HTTPS cover URL (security)', async () => {
    mockGetAuthUser.mockResolvedValue(MOCK_USER as never)
    mockPrisma.shelf.findFirst.mockResolvedValue({ id: 'shelf-1', profileId: 'user-1' } as never)
    mockPrisma.userBook.findFirst.mockResolvedValue(null)
    mockPrisma.book.upsert.mockResolvedValue({ id: 'book-1' } as never)
    mockPrisma.userBook.create.mockResolvedValue({ id: 'ub-1', book: {}, shelf: {}, readingProgress: null, rating: null } as never)

    const bookWithHttpCover = { ...VALID_BOOK, coverUrl: 'http://evil.com/img.jpg' }
    await POST(makePostRequest({ book: bookWithHttpCover, shelfId: 'shelf-1' }))

    expect(mockPrisma.book.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ coverUrl: null }),
      })
    )
  })

  it('strips invalid isbn13', async () => {
    mockGetAuthUser.mockResolvedValue(MOCK_USER as never)
    mockPrisma.shelf.findFirst.mockResolvedValue({ id: 'shelf-1', profileId: 'user-1' } as never)
    mockPrisma.userBook.findFirst.mockResolvedValue(null)
    mockPrisma.book.upsert.mockResolvedValue({ id: 'book-1' } as never)
    mockPrisma.userBook.create.mockResolvedValue({ id: 'ub-1', book: {}, shelf: {}, readingProgress: null, rating: null } as never)

    const bookWithBadIsbn = { ...VALID_BOOK, isbn13: 'not-a-number' }
    await POST(makePostRequest({ book: bookWithBadIsbn, shelfId: 'shelf-1' }))

    expect(mockPrisma.book.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ isbn13: null }),
      })
    )
  })

  it('creates book and userBook on success and returns 201', async () => {
    mockGetAuthUser.mockResolvedValue(MOCK_USER as never)
    mockPrisma.shelf.findFirst.mockResolvedValue({ id: 'shelf-1', profileId: 'user-1' } as never)
    mockPrisma.userBook.findFirst.mockResolvedValue(null)
    mockPrisma.book.upsert.mockResolvedValue({ id: 'book-1' } as never)
    mockPrisma.userBook.create.mockResolvedValue({
      id: 'ub-1',
      bookId: 'book-1',
      shelfId: 'shelf-1',
      book: {},
      shelf: {},
      readingProgress: null,
      rating: null,
    } as never)

    const res = await POST(makePostRequest({ book: VALID_BOOK, shelfId: 'shelf-1' }))

    expect(res.status).toBe(201)
    expect(mockPrisma.book.upsert).toHaveBeenCalled()
    expect(mockPrisma.userBook.create).toHaveBeenCalled()
  })
})

describe('DELETE /api/library/books', () => {
  it('returns 401 when unauthenticated', async () => {
    mockGetAuthUser.mockResolvedValue(null)
    const res = await DELETE(makeDeleteRequest('ub-1'))
    expect(res.status).toBe(401)
  })

  it('returns 400 when userBookId query param is missing', async () => {
    mockGetAuthUser.mockResolvedValue(MOCK_USER as never)
    const res = await DELETE(makeDeleteRequest())
    expect(res.status).toBe(400)
  })

  it('returns 404 when userBookId belongs to another user (IDOR)', async () => {
    mockGetAuthUser.mockResolvedValue(MOCK_USER as never)
    mockPrisma.userBook.findFirst.mockResolvedValue(null)
    const res = await DELETE(makeDeleteRequest('other-users-book'))
    expect(res.status).toBe(404)
  })

  it('calls userBook.delete and returns 204 on success', async () => {
    mockGetAuthUser.mockResolvedValue(MOCK_USER as never)
    mockPrisma.userBook.findFirst.mockResolvedValue({ id: 'ub-1', profileId: 'user-1' } as never)
    mockPrisma.userBook.delete.mockResolvedValue({} as never)

    const res = await DELETE(makeDeleteRequest('ub-1'))

    expect(res.status).toBe(204)
    expect(mockPrisma.userBook.delete).toHaveBeenCalledWith({ where: { id: 'ub-1' } })
  })
})
