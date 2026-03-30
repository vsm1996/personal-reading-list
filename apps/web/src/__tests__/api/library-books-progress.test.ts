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
import { POST } from '@/app/api/library/books/[id]/progress/route'

const mockGetAuthUser = vi.mocked(getAuthUser)
const mockPrisma = vi.mocked(prisma)

const MOCK_USER = { id: 'user-1', is_anonymous: false, app_metadata: {} }

beforeEach(() => { vi.clearAllMocks() })

function makePostRequest(id: string, body: unknown) {
  return new Request(`http://localhost/api/library/books/${id}/progress`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) }
}

function mockUserBook(overrides: Record<string, unknown> = {}) {
  return {
    id: 'ub-1',
    profileId: 'user-1',
    shelfId: 'currently-reading-shelf',
    dateFinished: null,
    book: { pageCount: 100 },
    ...overrides,
  }
}

describe('POST /api/library/books/[id]/progress', () => {
  it('returns 401 when unauthenticated', async () => {
    mockGetAuthUser.mockResolvedValue(null)
    const res = await POST(makePostRequest('ub-1', { currentPage: 42 }), makeParams('ub-1'))
    expect(res.status).toBe(401)
  })

  it('returns 404 when userBook belongs to another user (IDOR)', async () => {
    mockGetAuthUser.mockResolvedValue(MOCK_USER as never)
    mockPrisma.userBook.findFirst.mockResolvedValue(null)
    const res = await POST(makePostRequest('other-book', { currentPage: 42 }), makeParams('other-book'))
    expect(res.status).toBe(404)
  })

  it('returns 400 for negative currentPage', async () => {
    mockGetAuthUser.mockResolvedValue(MOCK_USER as never)
    mockPrisma.userBook.findFirst.mockResolvedValue(mockUserBook() as never)
    const res = await POST(makePostRequest('ub-1', { currentPage: -1 }), makeParams('ub-1'))
    expect(res.status).toBe(400)
  })

  it('returns 400 for fractional currentPage', async () => {
    mockGetAuthUser.mockResolvedValue(MOCK_USER as never)
    mockPrisma.userBook.findFirst.mockResolvedValue(mockUserBook() as never)
    const res = await POST(makePostRequest('ub-1', { currentPage: 10.5 }), makeParams('ub-1'))
    expect(res.status).toBe(400)
  })

  it('correctly calculates percentage: pageCount=100, currentPage=42 → 42%', async () => {
    mockGetAuthUser.mockResolvedValue(MOCK_USER as never)
    mockPrisma.userBook.findFirst.mockResolvedValue(mockUserBook({ book: { pageCount: 100 } }) as never)
    mockPrisma.shelf.findFirst.mockResolvedValue(null) // no auto-move
    mockPrisma.$transaction.mockResolvedValue([{ currentPage: 42, percentage: 42 }, {}])

    const res = await POST(makePostRequest('ub-1', { currentPage: 42 }), makeParams('ub-1'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.percentage).toBe(42)
    expect(body.currentPage).toBe(42)
  })

  it('percentage caps at 100 when currentPage exceeds pageCount', async () => {
    mockGetAuthUser.mockResolvedValue(MOCK_USER as never)
    mockPrisma.userBook.findFirst.mockResolvedValue(mockUserBook({ book: { pageCount: 100 } }) as never)
    mockPrisma.shelf.findFirst.mockResolvedValue({ id: 'read-shelf' } as never)
    mockPrisma.$transaction.mockResolvedValue([{ currentPage: 150, percentage: 100 }, {}, {}])

    const res = await POST(makePostRequest('ub-1', { currentPage: 150 }), makeParams('ub-1'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.percentage).toBe(100)
  })

  it('page=0 with no pageCount → percentage=0', async () => {
    mockGetAuthUser.mockResolvedValue(MOCK_USER as never)
    mockPrisma.userBook.findFirst.mockResolvedValue(mockUserBook({ book: { pageCount: null } }) as never)
    mockPrisma.$transaction.mockResolvedValue([{ currentPage: 0, percentage: 0 }, {}])

    const res = await POST(makePostRequest('ub-1', { currentPage: 0 }), makeParams('ub-1'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.percentage).toBe(0)
  })

  it('page=5 with no pageCount → percentage=100 (unknown length)', async () => {
    mockGetAuthUser.mockResolvedValue(MOCK_USER as never)
    mockPrisma.userBook.findFirst.mockResolvedValue(mockUserBook({ book: { pageCount: null } }) as never)
    mockPrisma.shelf.findFirst.mockResolvedValue({ id: 'read-shelf' } as never)
    mockPrisma.$transaction.mockResolvedValue([{ currentPage: 5, percentage: 100 }, {}, {}])

    const res = await POST(makePostRequest('ub-1', { currentPage: 5 }), makeParams('ub-1'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.percentage).toBe(100)
  })

  it('auto-moves to Read shelf when percentage is 100 and book is not already on Read shelf', async () => {
    mockGetAuthUser.mockResolvedValue(MOCK_USER as never)
    mockPrisma.userBook.findFirst.mockResolvedValue(
      mockUserBook({ shelfId: 'currently-reading-shelf', book: { pageCount: 300 } }) as never
    )
    mockPrisma.shelf.findFirst.mockResolvedValue({ id: 'read-shelf' } as never)
    mockPrisma.$transaction.mockResolvedValue([{ currentPage: 300, percentage: 100 }, {}, {}])

    const res = await POST(makePostRequest('ub-1', { currentPage: 300 }), makeParams('ub-1'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.movedToRead).toBe(true)
  })

  it('does NOT auto-move when book is already on the Read shelf', async () => {
    mockGetAuthUser.mockResolvedValue(MOCK_USER as never)
    // shelfId already matches read-shelf
    mockPrisma.userBook.findFirst.mockResolvedValue(
      mockUserBook({ shelfId: 'read-shelf', book: { pageCount: 300 } }) as never
    )
    mockPrisma.shelf.findFirst.mockResolvedValue({ id: 'read-shelf' } as never)
    mockPrisma.$transaction.mockResolvedValue([{ currentPage: 300, percentage: 100 }, {}])

    const res = await POST(makePostRequest('ub-1', { currentPage: 300 }), makeParams('ub-1'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.movedToRead).toBe(false)
  })

  it('calls $transaction with readingProgress.upsert and progressHistory.create', async () => {
    mockGetAuthUser.mockResolvedValue(MOCK_USER as never)
    mockPrisma.userBook.findFirst.mockResolvedValue(mockUserBook({ book: { pageCount: 100 } }) as never)
    mockPrisma.shelf.findFirst.mockResolvedValue(null)

    // Capture the transaction callback to verify what's passed
    let capturedOps: unknown[] | null = null
    mockPrisma.$transaction.mockImplementation(async (ops: unknown) => {
      capturedOps = ops as unknown[]
      return [{ currentPage: 42, percentage: 42 }, {}]
    })

    await POST(makePostRequest('ub-1', { currentPage: 42 }), makeParams('ub-1'))

    expect(mockPrisma.$transaction).toHaveBeenCalled()
    // The transaction receives an array of prisma operations
    expect(capturedOps).not.toBeNull()
    // readingProgress.upsert and progressHistory.create should have been called to build ops
    expect(mockPrisma.readingProgress.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userBookId: 'ub-1' },
        create: expect.objectContaining({ currentPage: 42, percentage: 42 }),
        update: expect.objectContaining({ currentPage: 42, percentage: 42 }),
      })
    )
    expect(mockPrisma.progressHistory.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userBookId: 'ub-1', page: 42, percentage: 42 }),
      })
    )
  })
})
